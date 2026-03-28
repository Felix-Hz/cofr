use std::io::Cursor;

use super::*;

fn sample_transaction() -> TransactionRow {
    TransactionRow {
        date: "2026-01-15T10:30:00+00:00".to_string(),
        description: "Coffee".to_string(),
        amount: 5.50,
        currency: "NZD".to_string(),
        category: "Food".to_string(),
        category_type: "expense".to_string(),
        account: "Checking".to_string(),
        account_type: "checking".to_string(),
        is_transfer: false,
        transfer_direction: String::new(),
        is_opening_balance: false,
    }
}

#[test]
fn xlsx_output_is_valid_zip() {
    let rows = vec![sample_transaction()];
    let bytes = build_transactions_xlsx(&rows, "NZD").unwrap();
    assert!(bytes.len() > 4);
    assert_eq!(&bytes[0..2], b"PK");
    let cursor = Cursor::new(bytes);
    assert!(zip::ZipArchive::new(cursor).is_ok());
}

#[test]
fn xlsx_multi_sheet_full_dump() {
    let tx = vec![sample_transaction()];
    let acc = vec![AccountRow {
        name: "Checking".to_string(),
        account_type: "checking".to_string(),
        balance: 1000.0,
    }];
    let cat = vec![CategoryRow {
        name: "Food".to_string(),
        category_type: "expense".to_string(),
        total: 500.0,
        count: 10,
    }];

    let bytes = build_full_dump_xlsx(&tx, &acc, &cat, "NZD").unwrap();
    assert!(bytes.len() > 4);
    assert_eq!(&bytes[0..2], b"PK");

    let cursor = Cursor::new(bytes);
    let archive = zip::ZipArchive::new(cursor).unwrap();
    let names: Vec<String> = archive.file_names().map(|s| s.to_string()).collect();
    let sheet_count = names
        .iter()
        .filter(|n| n.starts_with("xl/worksheets/sheet"))
        .count();
    assert_eq!(sheet_count, 3);
}

#[test]
fn xlsx_empty_rows_produces_header_only() {
    let bytes = build_transactions_xlsx(&[], "NZD").unwrap();
    assert!(bytes.len() > 4);
    assert_eq!(&bytes[0..2], b"PK");
}

#[test]
fn xlsx_unicode_descriptions() {
    let row = TransactionRow {
        description: "Cafe with emoji and CJK chars".to_string(),
        ..sample_transaction()
    };
    let bytes = build_transactions_xlsx(&[row], "NZD").unwrap();
    assert!(bytes.len() > 4);
    let cursor = Cursor::new(bytes);
    assert!(zip::ZipArchive::new(cursor).is_ok());
}

#[test]
fn xlsx_accounts_single_sheet() {
    let acc = AccountRow {
        name: "Savings".to_string(),
        account_type: "savings".to_string(),
        balance: 5000.0,
    };
    let bytes = build_accounts_xlsx(&[acc]).unwrap();
    assert!(bytes.len() > 4);
    let cursor = Cursor::new(bytes);
    let archive = zip::ZipArchive::new(cursor).unwrap();
    let sheet_count = archive
        .file_names()
        .filter(|n| n.starts_with("xl/worksheets/sheet"))
        .count();
    assert_eq!(sheet_count, 1);
}

#[test]
fn xlsx_categories_single_sheet() {
    let cat = CategoryRow {
        name: "Transport".to_string(),
        category_type: "expense".to_string(),
        total: 200.0,
        count: 5,
    };
    let bytes = build_categories_xlsx(&[cat]).unwrap();
    assert!(bytes.len() > 4);
    let cursor = Cursor::new(bytes);
    assert!(zip::ZipArchive::new(cursor).is_ok());
}
