use std::io::Cursor;

use crate::models::{
    AccountRow, CategoryRow, TransactionRow, ACCOUNT_HEADERS, CATEGORY_HEADERS, TRANSACTION_HEADERS,
};

pub fn write_transactions_csv(rows: &[TransactionRow]) -> Result<Vec<u8>, csv::Error> {
    let mut wtr = csv::Writer::from_writer(Vec::new());
    wtr.write_record(TRANSACTION_HEADERS)?;
    for row in rows {
        wtr.write_record(row.to_csv_record())?;
    }
    Ok(wtr.into_inner().map_err(|e| e.into_error())?)
}

pub fn write_accounts_csv(rows: &[AccountRow]) -> Result<Vec<u8>, csv::Error> {
    let mut wtr = csv::Writer::from_writer(Vec::new());
    wtr.write_record(ACCOUNT_HEADERS)?;
    for row in rows {
        wtr.write_record(row.to_csv_record())?;
    }
    Ok(wtr.into_inner().map_err(|e| e.into_error())?)
}

pub fn write_categories_csv(rows: &[CategoryRow]) -> Result<Vec<u8>, csv::Error> {
    let mut wtr = csv::Writer::from_writer(Vec::new());
    wtr.write_record(CATEGORY_HEADERS)?;
    for row in rows {
        wtr.write_record(row.to_csv_record())?;
    }
    Ok(wtr.into_inner().map_err(|e| e.into_error())?)
}

pub fn write_full_dump_zip(
    transactions: &[TransactionRow],
    accounts: &[AccountRow],
    categories: &[CategoryRow],
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let buf = Cursor::new(Vec::new());
    let mut zip = zip::ZipWriter::new(buf);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    zip.start_file("transactions.csv", options)?;
    let tx_bytes = write_transactions_csv(transactions)?;
    std::io::Write::write_all(&mut zip, &tx_bytes)?;

    zip.start_file("accounts.csv", options)?;
    let acc_bytes = write_accounts_csv(accounts)?;
    std::io::Write::write_all(&mut zip, &acc_bytes)?;

    zip.start_file("categories.csv", options)?;
    let cat_bytes = write_categories_csv(categories)?;
    std::io::Write::write_all(&mut zip, &cat_bytes)?;

    let cursor = zip.finish()?;
    Ok(cursor.into_inner())
}

#[cfg(test)]
mod tests;
