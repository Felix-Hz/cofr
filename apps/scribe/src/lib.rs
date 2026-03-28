use pyo3::prelude::*;
use pyo3::types::PyDict;

mod export;
mod models;

use models::{AccountRow, CategoryRow, TransactionRow};

/// Export transactions to CSV bytes.
/// `rows` is a list of dicts with keys: date, description, amount, currency,
/// category, category_type, account, account_type, is_transfer, transfer_direction, is_opening_balance.
/// Returns CSV bytes.
#[pyfunction]
fn export_csv(rows: Vec<Bound<'_, PyDict>>, _currency: &str) -> PyResult<Vec<u8>> {
    let typed_rows: Vec<TransactionRow> = rows
        .iter()
        .map(|d| TransactionRow::from_pydict(d))
        .collect::<PyResult<Vec<_>>>()?;

    export::csv::write_transactions_csv(&typed_rows)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

/// Export transactions to XLSX bytes.
/// For single-scope export, pass rows + empty sheets dict.
/// For full dump, pass sheets dict with keys: "transactions" (list[dict]),
/// "accounts" (list[dict]), "categories" (list[dict]).
#[pyfunction]
fn export_xlsx(
    rows: Vec<Bound<'_, PyDict>>,
    sheets: Bound<'_, PyDict>,
    currency: &str,
) -> PyResult<Vec<u8>> {
    let has_accounts = sheets.contains("accounts")?;
    let has_categories = sheets.contains("categories")?;

    if has_accounts && has_categories {
        // Full dump mode
        let tx_rows: Vec<TransactionRow> = rows
            .iter()
            .map(|d| TransactionRow::from_pydict(d))
            .collect::<PyResult<Vec<_>>>()?;

        let acc_dicts: Vec<Bound<'_, PyDict>> = sheets
            .get_item("accounts")?
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("accounts"))?
            .extract()?;
        let acc_rows: Vec<AccountRow> = acc_dicts
            .iter()
            .map(|d| AccountRow::from_pydict(d))
            .collect::<PyResult<Vec<_>>>()?;

        let cat_dicts: Vec<Bound<'_, PyDict>> = sheets
            .get_item("categories")?
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("categories"))?
            .extract()?;
        let cat_rows: Vec<CategoryRow> = cat_dicts
            .iter()
            .map(|d| CategoryRow::from_pydict(d))
            .collect::<PyResult<Vec<_>>>()?;

        export::xlsx::build_full_dump_xlsx(&tx_rows, &acc_rows, &cat_rows, currency)
            .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
    } else if has_accounts {
        let acc_dicts: Vec<Bound<'_, PyDict>> = sheets
            .get_item("accounts")?
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("accounts"))?
            .extract()?;
        let acc_rows: Vec<AccountRow> = acc_dicts
            .iter()
            .map(|d| AccountRow::from_pydict(d))
            .collect::<PyResult<Vec<_>>>()?;

        export::xlsx::build_accounts_xlsx(&acc_rows)
            .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
    } else if has_categories {
        let cat_dicts: Vec<Bound<'_, PyDict>> = sheets
            .get_item("categories")?
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("categories"))?
            .extract()?;
        let cat_rows: Vec<CategoryRow> = cat_dicts
            .iter()
            .map(|d| CategoryRow::from_pydict(d))
            .collect::<PyResult<Vec<_>>>()?;

        export::xlsx::build_categories_xlsx(&cat_rows)
            .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
    } else {
        // Single transactions sheet
        let typed_rows: Vec<TransactionRow> = rows
            .iter()
            .map(|d| TransactionRow::from_pydict(d))
            .collect::<PyResult<Vec<_>>>()?;

        export::xlsx::build_transactions_xlsx(&typed_rows, currency)
            .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
    }
}

/// Export to PDF bytes.
/// `meta` dict should contain: "title" (str), "currency" (str), "scope" (str).
/// For scope "accounts", rows should be account dicts.
/// For scope "categories", rows should be category dicts.
/// For scope "full_dump", returns error (not supported for PDF).
#[pyfunction]
fn export_pdf(rows: Vec<Bound<'_, PyDict>>, meta: Bound<'_, PyDict>) -> PyResult<Vec<u8>> {
    let title: String = meta
        .get_item("title")?
        .map(|v| {
            v.extract::<String>()
                .unwrap_or_else(|_| "Cofr Export".to_string())
        })
        .unwrap_or_else(|| "Cofr Export".to_string());
    let currency: String = meta
        .get_item("currency")?
        .map(|v| v.extract::<String>().unwrap_or_else(|_| "NZD".to_string()))
        .unwrap_or_else(|| "NZD".to_string());
    let scope: String = meta
        .get_item("scope")?
        .map(|v| {
            v.extract::<String>()
                .unwrap_or_else(|_| "transactions".to_string())
        })
        .unwrap_or_else(|| "transactions".to_string());

    match scope.as_str() {
        "transactions" => {
            let typed_rows: Vec<TransactionRow> = rows
                .iter()
                .map(|d| TransactionRow::from_pydict(d))
                .collect::<PyResult<Vec<_>>>()?;
            export::pdf::build_transactions_pdf(&typed_rows, &title, &currency)
                .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
        }
        "accounts" => {
            let typed_rows: Vec<AccountRow> = rows
                .iter()
                .map(|d| AccountRow::from_pydict(d))
                .collect::<PyResult<Vec<_>>>()?;
            export::pdf::build_accounts_pdf(&typed_rows, &title)
                .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
        }
        "categories" => {
            let typed_rows: Vec<CategoryRow> = rows
                .iter()
                .map(|d| CategoryRow::from_pydict(d))
                .collect::<PyResult<Vec<_>>>()?;
            export::pdf::build_categories_pdf(&typed_rows, &title)
                .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
        }
        "full_dump" => Err(pyo3::exceptions::PyValueError::new_err(
            "PDF export is not supported for full data dump. Use CSV or XLSX instead.",
        )),
        _ => Err(pyo3::exceptions::PyValueError::new_err(format!(
            "Unknown scope: {}",
            scope
        ))),
    }
}

/// Export full dump as a ZIP containing CSV files for transactions, accounts, and categories.
#[pyfunction]
fn export_csv_full_dump(
    transactions: Vec<Bound<'_, PyDict>>,
    accounts: Vec<Bound<'_, PyDict>>,
    categories: Vec<Bound<'_, PyDict>>,
) -> PyResult<Vec<u8>> {
    let tx_rows: Vec<TransactionRow> = transactions
        .iter()
        .map(|d| TransactionRow::from_pydict(d))
        .collect::<PyResult<Vec<_>>>()?;
    let acc_rows: Vec<AccountRow> = accounts
        .iter()
        .map(|d| AccountRow::from_pydict(d))
        .collect::<PyResult<Vec<_>>>()?;
    let cat_rows: Vec<CategoryRow> = categories
        .iter()
        .map(|d| CategoryRow::from_pydict(d))
        .collect::<PyResult<Vec<_>>>()?;

    export::csv::write_full_dump_zip(&tx_rows, &acc_rows, &cat_rows)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

/// Export accounts to CSV bytes.
#[pyfunction]
fn export_accounts_csv(rows: Vec<Bound<'_, PyDict>>) -> PyResult<Vec<u8>> {
    let typed_rows: Vec<AccountRow> = rows
        .iter()
        .map(|d| AccountRow::from_pydict(d))
        .collect::<PyResult<Vec<_>>>()?;

    export::csv::write_accounts_csv(&typed_rows)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

/// Export categories to CSV bytes.
#[pyfunction]
fn export_categories_csv(rows: Vec<Bound<'_, PyDict>>) -> PyResult<Vec<u8>> {
    let typed_rows: Vec<CategoryRow> = rows
        .iter()
        .map(|d| CategoryRow::from_pydict(d))
        .collect::<PyResult<Vec<_>>>()?;

    export::csv::write_categories_csv(&typed_rows)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

#[pymodule]
fn scribe(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(export_csv, m)?)?;
    m.add_function(wrap_pyfunction!(export_xlsx, m)?)?;
    m.add_function(wrap_pyfunction!(export_pdf, m)?)?;
    m.add_function(wrap_pyfunction!(export_csv_full_dump, m)?)?;
    m.add_function(wrap_pyfunction!(export_accounts_csv, m)?)?;
    m.add_function(wrap_pyfunction!(export_categories_csv, m)?)?;
    Ok(())
}
