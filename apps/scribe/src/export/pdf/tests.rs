use super::*;

fn sample_transaction() -> TransactionRow {
    TransactionRow {
        date: "2026-01-15".to_string(),
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
fn pdf_output_starts_with_magic_bytes() {
    let rows = vec![sample_transaction()];
    let bytes = build_transactions_pdf(&rows, "Export", "NZD").unwrap();
    assert!(bytes.len() > 4);
    assert_eq!(&bytes[0..5], b"%PDF-");
}

#[test]
fn pdf_empty_rows_still_valid() {
    let bytes = build_transactions_pdf(&[], "Empty Export", "NZD").unwrap();
    assert_eq!(&bytes[0..5], b"%PDF-");
}

#[test]
fn pdf_page_count_scales_with_rows() {
    let many_rows: Vec<TransactionRow> = (0..100)
        .map(|i| TransactionRow {
            description: format!("Item {}", i),
            amount: i as f64,
            ..sample_transaction()
        })
        .collect();

    let bytes = build_transactions_pdf(&many_rows, "Big Export", "NZD").unwrap();
    let small_bytes = build_transactions_pdf(&[sample_transaction()], "Small", "NZD").unwrap();
    assert!(
        bytes.len() > small_bytes.len() * 2,
        "100-row PDF ({} bytes) should be significantly larger than 1-row PDF ({} bytes)",
        bytes.len(),
        small_bytes.len()
    );
}

#[test]
fn pdf_accounts_valid() {
    let acc = AccountRow {
        name: "Savings".to_string(),
        account_type: "savings".to_string(),
        balance: 5000.0,
    };
    let bytes = build_accounts_pdf(&[acc], "Accounts").unwrap();
    assert_eq!(&bytes[0..5], b"%PDF-");
}

#[test]
fn pdf_categories_valid() {
    let cat = CategoryRow {
        name: "Food".to_string(),
        category_type: "expense".to_string(),
        total: 500.0,
        count: 10,
    };
    let bytes = build_categories_pdf(&[cat], "Categories").unwrap();
    assert_eq!(&bytes[0..5], b"%PDF-");
}
