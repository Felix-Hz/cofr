use rust_xlsxwriter::{Format, Workbook};

use crate::models::{
    AccountRow, CategoryRow, TransactionRow, ACCOUNT_HEADERS, CATEGORY_HEADERS, TRANSACTION_HEADERS,
};

fn header_format() -> Format {
    Format::new().set_bold()
}

fn write_transactions_sheet(
    workbook: &mut Workbook,
    sheet_name: &str,
    rows: &[TransactionRow],
    currency: &str,
) -> Result<(), rust_xlsxwriter::XlsxError> {
    let sheet = workbook.add_worksheet();
    sheet.set_name(sheet_name)?;
    let hfmt = header_format();

    for (col, header) in TRANSACTION_HEADERS.iter().enumerate() {
        sheet.write_string_with_format(0, col as u16, *header, &hfmt)?;
    }

    sheet.set_column_width(0, 22)?;
    sheet.set_column_width(1, 40)?;
    sheet.set_column_width(2, 12)?;
    sheet.set_column_width(3, 10)?;
    sheet.set_column_width(4, 20)?;
    sheet.set_column_width(5, 14)?;
    sheet.set_column_width(6, 20)?;
    sheet.set_column_width(7, 14)?;

    sheet.set_freeze_panes(1, 0)?;

    for (r, row) in rows.iter().enumerate() {
        let r = (r + 1) as u32;
        sheet.write_string(r, 0, &row.date)?;
        sheet.write_string(r, 1, &row.description)?;
        sheet.write_number(r, 2, row.amount)?;
        sheet.write_string(
            r,
            3,
            if row.currency.is_empty() {
                currency
            } else {
                &row.currency
            },
        )?;
        sheet.write_string(r, 4, &row.category)?;
        sheet.write_string(r, 5, &row.category_type)?;
        sheet.write_string(r, 6, &row.account)?;
        sheet.write_string(r, 7, &row.account_type)?;
        sheet.write_string(r, 8, TransactionRow::format_bool(row.is_transfer))?;
        sheet.write_string(r, 9, &row.transfer_direction)?;
        sheet.write_string(r, 10, TransactionRow::format_bool(row.is_opening_balance))?;
    }

    Ok(())
}

fn write_accounts_sheet(
    workbook: &mut Workbook,
    rows: &[AccountRow],
) -> Result<(), rust_xlsxwriter::XlsxError> {
    let sheet = workbook.add_worksheet();
    sheet.set_name("Accounts")?;
    let hfmt = header_format();

    for (col, header) in ACCOUNT_HEADERS.iter().enumerate() {
        sheet.write_string_with_format(0, col as u16, *header, &hfmt)?;
    }

    sheet.set_column_width(0, 25)?;
    sheet.set_column_width(1, 15)?;
    sheet.set_column_width(2, 15)?;
    sheet.set_freeze_panes(1, 0)?;

    for (r, row) in rows.iter().enumerate() {
        let r = (r + 1) as u32;
        sheet.write_string(r, 0, &row.name)?;
        sheet.write_string(r, 1, &row.account_type)?;
        sheet.write_number(r, 2, row.balance)?;
    }

    Ok(())
}

fn write_categories_sheet(
    workbook: &mut Workbook,
    rows: &[CategoryRow],
) -> Result<(), rust_xlsxwriter::XlsxError> {
    let sheet = workbook.add_worksheet();
    sheet.set_name("Categories")?;
    let hfmt = header_format();

    for (col, header) in CATEGORY_HEADERS.iter().enumerate() {
        sheet.write_string_with_format(0, col as u16, *header, &hfmt)?;
    }

    sheet.set_column_width(0, 25)?;
    sheet.set_column_width(1, 15)?;
    sheet.set_column_width(2, 15)?;
    sheet.set_column_width(3, 18)?;
    sheet.set_freeze_panes(1, 0)?;

    for (r, row) in rows.iter().enumerate() {
        let r = (r + 1) as u32;
        sheet.write_string(r, 0, &row.name)?;
        sheet.write_string(r, 1, &row.category_type)?;
        sheet.write_number(r, 2, row.total)?;
        sheet.write_number(r, 3, row.count as f64)?;
    }

    Ok(())
}

pub fn build_transactions_xlsx(
    rows: &[TransactionRow],
    currency: &str,
) -> Result<Vec<u8>, rust_xlsxwriter::XlsxError> {
    let mut workbook = Workbook::new();
    write_transactions_sheet(&mut workbook, "Transactions", rows, currency)?;
    workbook.save_to_buffer()
}

pub fn build_full_dump_xlsx(
    transactions: &[TransactionRow],
    accounts: &[AccountRow],
    categories: &[CategoryRow],
    currency: &str,
) -> Result<Vec<u8>, rust_xlsxwriter::XlsxError> {
    let mut workbook = Workbook::new();
    write_transactions_sheet(&mut workbook, "Transactions", transactions, currency)?;
    write_accounts_sheet(&mut workbook, accounts)?;
    write_categories_sheet(&mut workbook, categories)?;
    workbook.save_to_buffer()
}

pub fn build_accounts_xlsx(rows: &[AccountRow]) -> Result<Vec<u8>, rust_xlsxwriter::XlsxError> {
    let mut workbook = Workbook::new();
    write_accounts_sheet(&mut workbook, rows)?;
    workbook.save_to_buffer()
}

pub fn build_categories_xlsx(rows: &[CategoryRow]) -> Result<Vec<u8>, rust_xlsxwriter::XlsxError> {
    let mut workbook = Workbook::new();
    write_categories_sheet(&mut workbook, rows)?;
    workbook.save_to_buffer()
}

#[cfg(test)]
mod tests;
