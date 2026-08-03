from sqlalchemy import Column, String, Float
from app.database import Base

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String, primary_key=True, index=True) # Identificador único, ej: osunar_contadores
    nombre = Column(String, nullable=False)
    rfc = Column(String, nullable=False)
    modulos = Column(String, default="Facturación") # Lista separada por comas, ej: "Facturación,Contabilidad,XMLs"
    comision_rate = Column(Float, default=1.5) # Tasa de comisión contratada, ej: 1.5%
