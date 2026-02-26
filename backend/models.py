from pydantic import BaseModel
from typing import List


class MonthlyRate(BaseModel):
    month: str
    rate: float


class BankInterestRate(BaseModel):
    bank_name: str
    rates_12_months: List[MonthlyRate]
