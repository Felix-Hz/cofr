use pyo3::prelude::*;
use pyo3::types::PyDict;
use serde::Serialize;

// Column headers for CSV/XLSX exports
pub const TRANSACTION_HEADERS: &[&str] = &[
    "Date",
    "Description",
    "Amount",
    "Currency",
    "Category",
    "Category Type",
    "Account",
    "Account Type",
    "Transfer",
    "Transfer Direction",
    "Opening Balance",
];

pub const ACCOUNT_HEADERS: &[&str] = &["Name", "Type", "Balance"];

pub const CATEGORY_HEADERS: &[&str] = &["Name", "Type", "Total", "Transaction Count"];

#[derive(Debug, Clone, Serialize)]
pub struct TransactionRow {
    pub date: String,
    pub description: String,
    pub amount: f64,
    pub currency: String,
    pub category: String,
    pub category_type: String,
    pub account: String,
    pub account_type: String,
    pub is_transfer: bool,
    pub transfer_direction: String,
    pub is_opening_balance: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct AccountRow {
    pub name: String,
    pub account_type: String,
    pub balance: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CategoryRow {
    pub name: String,
    pub category_type: String,
    pub total: f64,
    pub count: i64,
}

impl TransactionRow {
    pub fn from_pydict(dict: &Bound<'_, PyDict>) -> PyResult<Self> {
        Ok(Self {
            date: dict
                .get_item("date")?
                .map(|v| v.extract::<String>().unwrap_or_default())
                .unwrap_or_default(),
            description: dict
                .get_item("description")?
                .map(|v| v.extract::<String>().unwrap_or_default())
                .unwrap_or_default(),
            amount: dict
                .get_item("amount")?
                .map(|v| v.extract::<f64>().unwrap_or(0.0))
                .unwrap_or(0.0),
            currency: dict
                .get_item("currency")?
                .map(|v| v.extract::<String>().unwrap_or_default())
                .unwrap_or_default(),
            category: dict
                .get_item("category")?
                .map(|v| v.extract::<String>().unwrap_or_default())
                .unwrap_or_default(),
            category_type: dict
                .get_item("category_type")?
                .map(|v| v.extract::<String>().unwrap_or_default())
                .unwrap_or_default(),
            account: dict
                .get_item("account")?
                .map(|v| v.extract::<String>().unwrap_or_default())
                .unwrap_or_default(),
            account_type: dict
                .get_item("account_type")?
                .map(|v| v.extract::<String>().unwrap_or_default())
                .unwrap_or_default(),
            is_transfer: dict
                .get_item("is_transfer")?
                .map(|v| v.extract::<bool>().unwrap_or(false))
                .unwrap_or(false),
            transfer_direction: dict
                .get_item("transfer_direction")?
                .map(|v| v.extract::<String>().unwrap_or_default())
                .unwrap_or_default(),
            is_opening_balance: dict
                .get_item("is_opening_balance")?
                .map(|v| v.extract::<bool>().unwrap_or(false))
                .unwrap_or(false),
        })
    }

    pub fn format_bool(val: bool) -> &'static str {
        if val {
            "Yes"
        } else {
            "No"
        }
    }

    pub fn to_csv_record(&self) -> Vec<String> {
        vec![
            self.date.clone(),
            self.description.clone(),
            format!("{:.2}", self.amount),
            self.currency.clone(),
            self.category.clone(),
            self.category_type.clone(),
            self.account.clone(),
            self.account_type.clone(),
            Self::format_bool(self.is_transfer).to_string(),
            self.transfer_direction.clone(),
            Self::format_bool(self.is_opening_balance).to_string(),
        ]
    }
}

impl AccountRow {
    pub fn from_pydict(dict: &Bound<'_, PyDict>) -> PyResult<Self> {
        Ok(Self {
            name: dict
                .get_item("name")?
                .map(|v| v.extract::<String>().unwrap_or_default())
                .unwrap_or_default(),
            account_type: dict
                .get_item("type")?
                .map(|v| v.extract::<String>().unwrap_or_default())
                .unwrap_or_default(),
            balance: dict
                .get_item("balance")?
                .map(|v| v.extract::<f64>().unwrap_or(0.0))
                .unwrap_or(0.0),
        })
    }

    pub fn to_csv_record(&self) -> Vec<String> {
        vec![
            self.name.clone(),
            self.account_type.clone(),
            format!("{:.2}", self.balance),
        ]
    }
}

impl CategoryRow {
    pub fn from_pydict(dict: &Bound<'_, PyDict>) -> PyResult<Self> {
        Ok(Self {
            name: dict
                .get_item("name")?
                .map(|v| v.extract::<String>().unwrap_or_default())
                .unwrap_or_default(),
            category_type: dict
                .get_item("type")?
                .map(|v| v.extract::<String>().unwrap_or_default())
                .unwrap_or_default(),
            total: dict
                .get_item("total")?
                .map(|v| v.extract::<f64>().unwrap_or(0.0))
                .unwrap_or(0.0),
            count: dict
                .get_item("count")?
                .map(|v| v.extract::<i64>().unwrap_or(0))
                .unwrap_or(0),
        })
    }

    pub fn to_csv_record(&self) -> Vec<String> {
        vec![
            self.name.clone(),
            self.category_type.clone(),
            format!("{:.2}", self.total),
            self.count.to_string(),
        ]
    }
}
