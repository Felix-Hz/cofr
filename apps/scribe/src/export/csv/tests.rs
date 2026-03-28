use std::io::Cursor;

use super::*;

fn sample_transaction() -> TransactionRow {
    TransactionRow {
        date: "2026-01-15T10:30:00+00:00".to_string(),
        description: "Coffee at Blue Bottle".to_string(),
        amount: 5.50,
        currency: "NZD".to_string(),
        category: "Food & Drink".to_string(),
        category_type: "expense".to_string(),
        account: "Checking".to_string(),
        account_type: "checking".to_string(),
        is_transfer: false,
        transfer_direction: String::new(),
        is_opening_balance: false,
    }
}

fn sample_account() -> AccountRow {
    AccountRow {
        name: "Checking".to_string(),
        account_type: "checking".to_string(),
        balance: 1234.56,
    }
}

fn sample_category() -> CategoryRow {
    CategoryRow {
        name: "Food & Drink".to_string(),
        category_type: "expense".to_string(),
        total: 450.75,
        count: 23,
    }
}

#[test]
fn csv_empty_rows_produce_header_only() {
    let bytes = write_transactions_csv(&[]).unwrap();
    let content = String::from_utf8(bytes).unwrap();
    let lines: Vec<&str> = content.trim().split('\n').collect();
    assert_eq!(lines.len(), 1);
    assert!(lines[0].contains("Date"));
    assert!(lines[0].contains("Amount"));
}

#[test]
fn csv_single_row_correct_columns() {
    let row = sample_transaction();
    let bytes = write_transactions_csv(&[row]).unwrap();
    let content = String::from_utf8(bytes).unwrap();
    let lines: Vec<&str> = content.trim().split('\n').collect();
    assert_eq!(lines.len(), 2);
    assert!(lines[1].contains("Coffee at Blue Bottle"));
    assert!(lines[1].contains("5.50"));
    assert!(lines[1].contains("NZD"));
}

#[test]
fn csv_special_characters_escaped() {
    let row = TransactionRow {
        description: "Item with, comma and \"quotes\" and\nnewline".to_string(),
        ..sample_transaction()
    };
    let bytes = write_transactions_csv(&[row]).unwrap();
    let content = String::from_utf8(bytes).unwrap();
    assert!(content.contains("\"Item with, comma and \"\"quotes\"\" and\nnewline\""));
}

#[test]
fn csv_currency_formatting_two_decimals() {
    let row = TransactionRow {
        amount: 42.0,
        ..sample_transaction()
    };
    let bytes = write_transactions_csv(&[row]).unwrap();
    let content = String::from_utf8(bytes).unwrap();
    assert!(content.contains("42.00"));
}

#[test]
fn csv_transfer_row_includes_direction() {
    let row = TransactionRow {
        is_transfer: true,
        transfer_direction: "from".to_string(),
        category: "Transfer".to_string(),
        category_type: "transfer".to_string(),
        ..sample_transaction()
    };
    let bytes = write_transactions_csv(&[row]).unwrap();
    let content = String::from_utf8(bytes).unwrap();
    assert!(content.contains("Yes"));
    assert!(content.contains("from"));
}

#[test]
fn csv_boolean_fields_yes_no() {
    let row = TransactionRow {
        is_opening_balance: true,
        ..sample_transaction()
    };
    let bytes = write_transactions_csv(&[row]).unwrap();
    let content = String::from_utf8(bytes).unwrap();
    let lines: Vec<&str> = content.trim().split('\n').collect();
    assert!(lines[1].ends_with("Yes"));
}

#[test]
fn csv_unicode_in_descriptions() {
    let row = TransactionRow {
        description: "Cafe latte - 250ml".to_string(),
        ..sample_transaction()
    };
    let bytes = write_transactions_csv(&[row]).unwrap();
    let content = String::from_utf8(bytes).unwrap();
    assert!(content.contains("Cafe latte"));
}

#[test]
fn csv_zero_amount_transaction() {
    let row = TransactionRow {
        amount: 0.0,
        ..sample_transaction()
    };
    let bytes = write_transactions_csv(&[row]).unwrap();
    let content = String::from_utf8(bytes).unwrap();
    assert!(content.contains("0.00"));
}

#[test]
fn csv_accounts_export() {
    let acc = sample_account();
    let bytes = write_accounts_csv(&[acc]).unwrap();
    let content = String::from_utf8(bytes).unwrap();
    let lines: Vec<&str> = content.trim().split('\n').collect();
    assert_eq!(lines.len(), 2);
    assert!(lines[0].contains("Name"));
    assert!(lines[1].contains("Checking"));
    assert!(lines[1].contains("1234.56"));
}

#[test]
fn csv_categories_export() {
    let cat = sample_category();
    let bytes = write_categories_csv(&[cat]).unwrap();
    let content = String::from_utf8(bytes).unwrap();
    let lines: Vec<&str> = content.trim().split('\n').collect();
    assert_eq!(lines.len(), 2);
    assert!(lines[0].contains("Transaction Count"));
    assert!(lines[1].contains("Food & Drink"));
    assert!(lines[1].contains("23"));
}

#[test]
fn zip_full_dump_valid_archive() {
    let tx = sample_transaction();
    let acc = sample_account();
    let cat = sample_category();

    let bytes = write_full_dump_zip(&[tx], &[acc], &[cat]).unwrap();

    assert!(bytes.len() > 4);
    assert_eq!(&bytes[0..2], b"PK");

    let cursor = Cursor::new(bytes);
    let archive = zip::ZipArchive::new(cursor).unwrap();
    let names: Vec<&str> = archive.file_names().collect();
    assert!(names.contains(&"transactions.csv"));
    assert!(names.contains(&"accounts.csv"));
    assert!(names.contains(&"categories.csv"));
}

#[test]
fn zip_inner_files_have_headers() {
    let bytes = write_full_dump_zip(&[], &[], &[]).unwrap();
    let cursor = Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor).unwrap();

    let mut tx_file = archive.by_name("transactions.csv").unwrap();
    let mut tx_content = String::new();
    std::io::Read::read_to_string(&mut tx_file, &mut tx_content).unwrap();
    assert!(tx_content.contains("Date"));
    assert!(tx_content.contains("Amount"));

    drop(tx_file);
    let mut acc_file = archive.by_name("accounts.csv").unwrap();
    let mut acc_content = String::new();
    std::io::Read::read_to_string(&mut acc_file, &mut acc_content).unwrap();
    assert!(acc_content.contains("Name"));
    assert!(acc_content.contains("Balance"));
}

#[test]
fn csv_long_description_preserved() {
    let long_desc = "A".repeat(360);
    let row = TransactionRow {
        description: long_desc.clone(),
        ..sample_transaction()
    };
    let bytes = write_transactions_csv(&[row]).unwrap();
    let content = String::from_utf8(bytes).unwrap();
    assert!(content.contains(&long_desc));
}

#[test]
fn csv_empty_optional_fields() {
    let row = TransactionRow {
        category: String::new(),
        category_type: String::new(),
        transfer_direction: String::new(),
        ..sample_transaction()
    };
    let bytes = write_transactions_csv(&[row]).unwrap();
    let content = String::from_utf8(bytes).unwrap();
    let lines: Vec<&str> = content.trim().split('\n').collect();
    assert_eq!(lines.len(), 2);
}
