from pydantic import BaseModel
from typing import List, Optional

class TenantBase(BaseModel):
    id: str
    nombre: str
    rfc: str
    modulos: Optional[str] = "Facturación"
    comision_rate: Optional[float] = 1.5
    username: Optional[str] = None
    password: Optional[str] = None

class TenantCreate(TenantBase):
    pass

class TenantUpdate(BaseModel):
    modulos: Optional[str] = None
    comision_rate: Optional[float] = None

class TenantResponse(TenantBase):
    clientes_count: int = 0
    comision_acumulada: float = 0.0

    class Config:
        from_attributes = True
