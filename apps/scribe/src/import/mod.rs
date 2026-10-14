//! Bank statement parsing: the inverse of `export`.
//!
//! Turns a raw CSV download from a bank into normalized rows. This layer only
//! decodes and cleans what the bank wrote; deduplication against stored data and
//! categorization stay on the Python side.

mod anz;

use std::collections::HashMap;
use std::fmt;

use chrono::NaiveDate;

/// Separator for fingerprint fields; never appears in CSV text.
const FIELD_SEP: char = '\u{1f}';

#[derive(Debug, Clone, PartialEq)]
pub struct StatementRow {
    /// 1-based line in the source file, for error reporting and UI references.
    pub line: u64,
    pub date: NaiveDate,
    /// Signed: negative is money out of the account.
    pub amount_cents: i64,
    /// The bank's own transaction type, e.g. "Visa Purchase".
    pub kind: String,
    /// Best-effort counterparty name (store or payee), cleaned for display.
    pub merchant: String,
    /// Every remaining piece of information the bank provided, joined for humans.
    pub notes: String,
    pub card_last4: Option<String>,
    /// Foreign amount exactly as the bank wrote it, e.g. "USD 12.50".
    pub foreign_amount: Option<String>,
    pub conversion_charge_cents: Option<i64>,
    /// Stable identity of this row: the raw fields plus how many identical rows
    /// preceded it in the file, so two genuine same-day $5 coffees stay distinct
    /// while re-importing an overlapping file reproduces the same fingerprints.
    pub fingerprint: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct RowError {
    pub line: u64,
    pub message: String,
}

#[derive(Debug, Clone)]
pub struct Statement {
    pub format: &'static str,
    pub bank: &'static str,
    pub currency_hint: Option<&'static str>,
    /// Bank account number when the filename carries one.
    pub account_ref: Option<String>,
    pub rows: Vec<StatementRow>,
    pub errors: Vec<RowError>,
}

#[derive(Debug)]
pub enum ImportError {
    Empty,
    UnknownFormat(Vec<String>),
    Csv(csv::Error),
}

impl fmt::Display for ImportError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ImportError::Empty => write!(f, "The file is empty"),
            ImportError::UnknownFormat(headers) => write!(
                f,
                "Unrecognized statement format (columns: {}). Supported: ANZ New Zealand account export",
                headers.join(", ")
            ),
            ImportError::Csv(e) => write!(f, "Could not read CSV: {e}"),
        }
    }
}

impl std::error::Error for ImportError {}

impl From<csv::Error> for ImportError {
    fn from(e: csv::Error) -> Self {
        ImportError::Csv(e)
    }
}

pub fn parse_statement(data: &[u8], filename: Option<&str>) -> Result<Statement, ImportError> {
    let text = decode(data);
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(false)
        .flexible(true)
        .trim(csv::Trim::All)
        .from_reader(text.as_bytes());

    let mut records = reader.records();
    let headers = loop {
        match records.next() {
            None => return Err(ImportError::Empty),
            Some(record) => {
                let record = record?;
                if record.iter().any(|f| !f.is_empty()) {
                    break record.iter().map(str::to_string).collect::<Vec<_>>();
                }
            }
        }
    };

    let account_ref = filename.and_then(nz_account_from_filename);

    // Human line numbers from byte offsets (quoted fields may span lines). A record's
    // position can sit on the terminator that precedes it, so skip past those first.
    let bytes = text.as_bytes();
    let newlines: Vec<usize> = text.match_indices('\n').map(|(i, _)| i).collect();
    let line_at = |pos: Option<&csv::Position>| {
        pos.map(|p| {
            let mut start = p.byte() as usize;
            while matches!(bytes.get(start), Some(b'\r' | b'\n')) {
                start += 1;
            }
            newlines.partition_point(|&n| n < start) as u64 + 1
        })
        .unwrap_or(0)
    };

    if let Some(columns) = anz::AccountColumns::detect(&headers) {
        let mut statement = Statement {
            format: "anz_nz_account",
            bank: "ANZ",
            currency_hint: Some("NZD"),
            account_ref,
            rows: Vec::new(),
            errors: Vec::new(),
        };
        let mut fingerprints = Fingerprints::default();
        for record in records {
            match record {
                Ok(record) => {
                    let line = line_at(record.position());
                    anz::parse_record(&columns, &record, line, &mut fingerprints, &mut statement)
                }
                Err(e) => statement.errors.push(RowError {
                    line: line_at(e.position()),
                    message: format!("Unreadable row: {e}"),
                }),
            }
        }
        return Ok(statement);
    }

    Err(ImportError::UnknownFormat(headers))
}

/// Banks still emit Windows-1252 now and then; fall back to Latin-1 rather than fail.
fn decode(data: &[u8]) -> String {
    let data = data.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(data);
    match std::str::from_utf8(data) {
        Ok(s) => s.to_string(),
        Err(_) => data.iter().map(|&b| b as char).collect(),
    }
}

/// NZ bank account numbers look like `01-2345-6789012-00` and banks put them
/// at the start of the download filename.
fn nz_account_from_filename(filename: &str) -> Option<String> {
    let base = filename.rsplit(['/', '\\']).next()?;
    let candidate = base.split(['_', ' ', '.']).next()?;
    let parts: Vec<&str> = candidate.split('-').collect();
    let lengths_ok = parts.len() == 4
        && parts[0].len() == 2
        && parts[1].len() == 4
        && (7..=8).contains(&parts[2].len())
        && (2..=3).contains(&parts[3].len());
    let digits_ok = parts.iter().all(|p| p.chars().all(|c| c.is_ascii_digit()));
    (lengths_ok && digits_ok).then(|| candidate.to_string())
}

#[derive(Default)]
struct Fingerprints {
    seen: HashMap<String, u32>,
}

impl Fingerprints {
    fn next(&mut self, fields: &[&str]) -> String {
        let base = fields.join(&FIELD_SEP.to_string());
        let count = self.seen.entry(base.clone()).or_insert(0);
        let fingerprint = format!("{base}{FIELD_SEP}{count}");
        *count += 1;
        fingerprint
    }
}

/// Accepts `D/M/YYYY` (NZ banks) and ISO `YYYY-MM-DD`.
fn parse_date(raw: &str) -> Option<NaiveDate> {
    let raw = raw.trim();
    NaiveDate::parse_from_str(raw, "%d/%m/%Y")
        .or_else(|_| NaiveDate::parse_from_str(raw, "%Y-%m-%d"))
        .ok()
}

/// Exact decimal parse into cents; tolerates `$`, thousands separators and
/// accounting-style `(12.50)` negatives. Rejects sub-cent precision.
fn parse_amount_cents(raw: &str) -> Option<i64> {
    let cleaned: String = raw
        .chars()
        .filter(|c| !matches!(c, '$' | ',' | ' '))
        .collect();
    let (negative, body) =
        if let Some(inner) = cleaned.strip_prefix('(').and_then(|s| s.strip_suffix(')')) {
            (true, inner)
        } else if let Some(rest) = cleaned.strip_prefix('-') {
            (true, rest)
        } else {
            (false, cleaned.strip_prefix('+').unwrap_or(&cleaned))
        };

    let (whole, frac) = body.split_once('.').unwrap_or((body, ""));
    if whole.is_empty() && frac.is_empty() {
        return None;
    }
    if !whole.chars().all(|c| c.is_ascii_digit())
        || !frac.chars().all(|c| c.is_ascii_digit())
        || frac.len() > 2
    {
        return None;
    }
    let whole: i64 = if whole.is_empty() {
        0
    } else {
        whole.parse().ok()?
    };
    let frac: i64 = format!("{frac:0<2}").parse().ok()?;
    let cents = whole.checked_mul(100)?.checked_add(frac)?;
    Some(if negative { -cents } else { cents })
}

/// Collapses whitespace and softens SHOUTED bank text ("COUNTDOWN PONSONBY")
/// into title case, leaving short tokens like "BP" or "NZ" alone.
fn tidy(raw: &str) -> String {
    let collapsed = raw.split_whitespace().collect::<Vec<_>>().join(" ");
    let has_letters = collapsed.chars().any(char::is_alphabetic);
    let shouting = has_letters && !collapsed.chars().any(char::is_lowercase);
    if !shouting {
        return collapsed;
    }
    collapsed
        .split(' ')
        .map(|word| {
            if word.chars().count() <= 2 || word.chars().any(|c| c.is_ascii_digit()) {
                return word.to_string();
            }
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => first
                    .to_uppercase()
                    .chain(chars.flat_map(char::to_lowercase))
                    .collect(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests;
