use chrono::NaiveDate;

use super::*;

const ANZ_HEADER: &str =
    "Type,Details,Particulars,Code,Reference,Amount,Date,ForeignCurrencyAmount,ConversionCharge\r\n";

fn anz(rows: &str) -> Vec<u8> {
    format!("{ANZ_HEADER}{rows}").into_bytes()
}

fn date(d: u32, m: u32, y: i32) -> NaiveDate {
    NaiveDate::from_ymd_opt(y, m, d).unwrap()
}

const ANZ_FIXTURE: &[u8] = include_bytes!("fixtures/anz_nz_account.csv");
const ANZ_FIXTURE_NAME: &str = "01-2345-6789012-00_Transactions_2025-03-11_2025-03-14.csv";

#[test]
fn parses_anz_fixture() {
    let s = parse_statement(ANZ_FIXTURE, Some(ANZ_FIXTURE_NAME)).unwrap();

    assert_eq!(s.format, "anz_nz_account");
    assert_eq!(s.currency_hint, Some("NZD"));
    assert_eq!(s.account_ref.as_deref(), Some("01-2345-6789012-00"));
    assert!(s.errors.is_empty());
    assert_eq!(s.rows.len(), 11);

    let card = &s.rows[0];
    assert_eq!(card.line, 2);
    assert_eq!(card.date, date(14, 3, 2025));
    assert_eq!(card.amount_cents, -8420);
    assert_eq!(card.merchant, "Corner Fuel");
    assert_eq!(card.card_last4.as_deref(), Some("1234"));
    assert_eq!(card.notes, "Visa Purchase · card ••1234");

    // Same-day identical coffees are two real purchases.
    assert_ne!(s.rows[1].fingerprint, s.rows[2].fingerprint);

    let payment = &s.rows[3];
    assert_eq!(payment.merchant, "Alex Sample");
    assert_eq!(payment.amount_cents, -2500);
    assert_eq!(payment.card_last4, None);
    assert_eq!(payment.notes, "Payment · Parking");

    assert_eq!(s.rows[4].merchant, "Northside Gro");
    assert_eq!(s.rows[5].foreign_amount.as_deref(), Some("USD 13.99"));
    assert_eq!(s.rows[7].amount_cents, 325_000);
    assert_eq!(s.rows[9].merchant, "Interest");
    assert_eq!(s.rows[10].line, 12);
}

#[test]
fn identical_rows_get_distinct_but_reproducible_fingerprints() {
    let rows = concat!(
        "Visa Purchase,4000-****-****-1234  Df,,Coffee Co,,-5.00,14/03/2025,,\r\n",
        "Visa Purchase,4000-****-****-1234  Df,,Coffee Co,,-5.00,14/03/2025,,\r\n",
    );
    let first = parse_statement(&anz(rows), None).unwrap();
    assert_ne!(first.rows[0].fingerprint, first.rows[1].fingerprint);

    // An overlapping re-export yields the same identities, so it dedups cleanly.
    let again = parse_statement(&anz(rows), None).unwrap();
    let ids = |s: &Statement| {
        s.rows
            .iter()
            .map(|r| r.fingerprint.clone())
            .collect::<Vec<_>>()
    };
    assert_eq!(ids(&first), ids(&again));
}

#[test]
fn credit_foreign_currency_and_shouting_text() {
    let data = anz(concat!(
        "Direct Credit,ACME PAYROLL LTD,Salary,Oct,,\"3,250.00\",15/10/2026,,\r\n",
        "Visa Purchase,4000-****-****-1234  Df,,NETFLIX.COM,,-22.99,1/10/2026,USD 13.99,0.65\r\n",
    ));
    let s = parse_statement(&data, None).unwrap();

    let salary = &s.rows[0];
    assert_eq!(salary.amount_cents, 325_000);
    assert_eq!(salary.merchant, "Acme Payroll Ltd");
    assert_eq!(salary.notes, "Direct Credit · Salary · Oct");

    let fx = &s.rows[1];
    assert_eq!(fx.date, date(1, 10, 2026));
    assert_eq!(fx.foreign_amount.as_deref(), Some("USD 13.99"));
    assert_eq!(fx.conversion_charge_cents, Some(65));
    assert!(fx
        .notes
        .ends_with("foreign amount USD 13.99 · conversion charge 0.65"));
}

#[test]
fn falls_back_to_type_when_no_counterparty() {
    let s = parse_statement(&anz("Interest,,,,,1.23,31/10/2026,,\r\n"), None).unwrap();
    assert_eq!(s.rows[0].merchant, "Interest");
    assert_eq!(s.rows[0].notes, "Interest");
}

#[test]
fn bad_rows_are_reported_not_fatal() {
    let data = anz(concat!(
        "Payment,Someone,,,,-1.00,31/02/2026,,\r\n",
        "Payment,Someone,,,,abc,01/02/2026,,\r\n",
        "Payment,Someone,,,,0.00,01/02/2026,,\r\n",
        ",,,,,,,,\r\n",
        "Payment,Someone,,,,-1.00,01/02/2026,,\r\n",
    ));
    let s = parse_statement(&data, None).unwrap();
    assert_eq!(s.rows.len(), 1);
    assert_eq!(
        s.errors.iter().map(|e| e.line).collect::<Vec<_>>(),
        vec![2, 3, 4]
    );
    assert!(s.errors[0].message.contains("date"));
    assert!(s.errors[1].message.contains("amount"));
}

#[test]
fn handles_bom_latin1_and_reordered_columns() {
    let mut data = b"\xEF\xBB\xBFDate,Amount,Type,Details,Particulars,Code,Reference\n".to_vec();
    data.extend_from_slice(b"14/03/2025,-4.50,Eftpos,Caf\xE9 Rouge,,,\n");
    let s = parse_statement(&data, None).unwrap();
    assert_eq!(s.rows[0].merchant, "Café Rouge");
    assert_eq!(s.rows[0].amount_cents, -450);
}

#[test]
fn rejects_unknown_and_empty_files() {
    assert!(matches!(
        parse_statement(b"foo,bar\n1,2\n", None),
        Err(ImportError::UnknownFormat(h)) if h == vec!["foo", "bar"]
    ));
    assert!(matches!(
        parse_statement(b"\r\n\r\n", None),
        Err(ImportError::Empty)
    ));
}

#[test]
fn amount_parsing() {
    assert_eq!(parse_amount_cents("-84.20"), Some(-8420));
    assert_eq!(parse_amount_cents("$1,000"), Some(100_000));
    assert_eq!(parse_amount_cents("(12.5)"), Some(-1250));
    assert_eq!(parse_amount_cents(".05"), Some(5));
    assert_eq!(parse_amount_cents("1.234"), None);
    assert_eq!(parse_amount_cents("-"), None);
    assert_eq!(parse_amount_cents(""), None);
}

#[test]
fn account_from_filename() {
    assert_eq!(
        nz_account_from_filename("/tmp/01-2345-6789012-00_Transactions_2025-03-11.csv").as_deref(),
        Some("01-2345-6789012-00")
    );
    assert_eq!(nz_account_from_filename("Transactions.csv"), None);
    assert_eq!(nz_account_from_filename("12-34-56-78.csv"), None);
}

#[test]
fn tidy_text() {
    assert_eq!(tidy("COUNTDOWN  PONSONBY"), "Countdown Ponsonby");
    assert_eq!(tidy("BP CONNECT 2"), "BP Connect 2");
    assert_eq!(tidy("Mixed-Case St"), "Mixed-Case St");
}
