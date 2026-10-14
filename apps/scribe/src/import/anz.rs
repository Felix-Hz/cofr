//! ANZ New Zealand account export:
//! `Type,Details,Particulars,Code,Reference,Amount,Date,ForeignCurrencyAmount,ConversionCharge`
//!
//! Card purchases put a masked card number in Details and the store in Code
//! (truncated to 12 chars by the NZ payments system); everything else puts the
//! payee in Details and free text in Particulars/Code/Reference.

use csv::StringRecord;

use super::{
    parse_amount_cents, parse_date, tidy, Fingerprints, RowError, Statement, StatementRow,
};

pub(super) struct AccountColumns {
    kind: usize,
    details: usize,
    particulars: usize,
    code: usize,
    reference: usize,
    amount: usize,
    date: usize,
    foreign_amount: Option<usize>,
    conversion_charge: Option<usize>,
}

impl AccountColumns {
    pub(super) fn detect(headers: &[String]) -> Option<Self> {
        let find = |name: &str| {
            headers
                .iter()
                .position(|h| h.trim().eq_ignore_ascii_case(name))
        };
        Some(Self {
            kind: find("Type")?,
            details: find("Details")?,
            particulars: find("Particulars")?,
            code: find("Code")?,
            reference: find("Reference")?,
            amount: find("Amount")?,
            date: find("Date")?,
            foreign_amount: find("ForeignCurrencyAmount"),
            conversion_charge: find("ConversionCharge"),
        })
    }
}

pub(super) fn parse_record(
    columns: &AccountColumns,
    record: &StringRecord,
    line: u64,
    fingerprints: &mut Fingerprints,
    statement: &mut Statement,
) {
    if record.iter().all(str::is_empty) {
        return;
    }
    let field = |idx: usize| record.get(idx).unwrap_or("");
    let error = |message: String| RowError { line, message };

    let (kind, details) = (field(columns.kind), field(columns.details));
    let (particulars, code, reference) = (
        field(columns.particulars),
        field(columns.code),
        field(columns.reference),
    );
    let (raw_date, raw_amount) = (field(columns.date), field(columns.amount));

    let Some(date) = parse_date(raw_date) else {
        statement
            .errors
            .push(error(format!("Unreadable date \"{raw_date}\"")));
        return;
    };
    let Some(amount_cents) = parse_amount_cents(raw_amount) else {
        statement
            .errors
            .push(error(format!("Unreadable amount \"{raw_amount}\"")));
        return;
    };
    if amount_cents == 0 {
        statement
            .errors
            .push(error("Zero-amount entry skipped".to_string()));
        return;
    }

    let card_last4 = masked_card_last4(details);
    let free_text = [particulars, code, reference];

    // Card rows: the store lives in the free-text fields. Others: the payee is Details.
    let (merchant_raw, leftovers): (&str, Vec<&str>) = if card_last4.is_some() || details.is_empty()
    {
        let pos = free_text.iter().position(|s| !s.is_empty());
        let merchant = pos.map(|i| free_text[i]).unwrap_or("");
        let rest = free_text
            .iter()
            .enumerate()
            .filter(|(i, s)| Some(*i) != pos && !s.is_empty())
            .map(|(_, s)| *s)
            .collect();
        (merchant, rest)
    } else {
        (
            details,
            free_text.into_iter().filter(|s| !s.is_empty()).collect(),
        )
    };
    let merchant = match tidy(merchant_raw) {
        m if m.is_empty() => tidy(kind),
        m => m,
    };

    let foreign_amount = columns
        .foreign_amount
        .map(field)
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    let conversion_charge_cents = columns
        .conversion_charge
        .map(field)
        .and_then(parse_amount_cents)
        .filter(|c| *c != 0);

    let mut notes: Vec<String> = Vec::new();
    if !kind.is_empty() {
        notes.push(kind.to_string());
    }
    notes.extend(leftovers.iter().map(|s| tidy(s)));
    if let Some(last4) = &card_last4 {
        notes.push(format!("card ••{last4}"));
    }
    if let Some(fx) = &foreign_amount {
        notes.push(format!("foreign amount {fx}"));
    }
    if let Some(charge) = conversion_charge_cents {
        notes.push(format!(
            "conversion charge {}.{:02}",
            charge.abs() / 100,
            charge.abs() % 100
        ));
    }

    let fingerprint = fingerprints.next(&[
        &date.to_string(),
        &amount_cents.to_string(),
        kind,
        details,
        particulars,
        code,
        reference,
    ]);

    statement.rows.push(StatementRow {
        line,
        date,
        amount_cents,
        kind: kind.to_string(),
        merchant,
        notes: notes.join(" · "),
        card_last4,
        foreign_amount,
        conversion_charge_cents,
        fingerprint,
    });
}

/// `4000-****-****-1234  Df` → `1234`
fn masked_card_last4(details: &str) -> Option<String> {
    let token = details.split_whitespace().find(|t| t.contains('*'))?;
    let last = token.rsplit('-').next()?;
    (last.len() == 4 && last.chars().all(|c| c.is_ascii_digit())).then(|| last.to_string())
}
