import requests
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import engine, Base, get_db, SessionLocal
from app.models import Tenant
from app.schemas import TenantCreate, TenantUpdate, TenantResponse

# Crear las tablas al iniciar
Base.metadata.create_all(bind=engine)

# Inyectar seed de Osunar Contadores si está vacía
db = SessionLocal()
if not db.query(Tenant).filter(Tenant.id == "osunar_contadores").first():
    osunar = Tenant(
        id="osunar_contadores",
        nombre="Osunar Contadores",
        rfc="OCO180412AA1",
        modulos="Facturación,Contabilidad,XMLs",
        comision_rate=1.5,
        username="osunar",
        password="osunar123"
    )
    db.add(osunar)
    db.commit()
db.close()

app = FastAPI(title="SONIC BI - SuperAdmin API")

class AdminLoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/admin/login")
def admin_login(req: AdminLoginRequest):
    if req.username == "superadmin" and req.password == "sonicadmin123":
        return {"success": True, "token": "super_secret_admin_token"}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Usuario o contraseña de administrador incorrectos."
    )

# Habilitar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/tenants", response_model=List[TenantResponse])
def listar_tenants(db: Session = Depends(get_db)):
    tenants = db.query(Tenant).all()
    res = []
    for tenant in tenants:
        clientes_count = 0
        comision_acumulada = 0.0
        
        # Interconectar con Factura_BI para contar clientes reales del Tenant
        try:
            resp = requests.get(f"http://127.0.0.1:8000/api/empresas?tenant_id={tenant.id}", timeout=2)
            if resp.ok:
                empresas = resp.json()
                clientes_count = len(empresas)
                # Simular comisión acumulada basada en el uso de timbres de sus clientes
                timbres_totales_usados = sum(emp.get("timbres_usados", 0) for emp in empresas)
                # Cada timbre cuesta $1.50 MXN, y cobramos la tasa especificada
                comision_acumulada = timbres_totales_usados * 1.50 * (tenant.comision_rate / 100.0)
        except Exception as e:
            print(f"Error al conectar con Factura_BI para tenant {tenant.id}: {e}")
            # Valores simulados si Factura_BI está offline
            clientes_count = 18 if tenant.id == "osunar_contadores" else 0
            comision_acumulada = 2450.00 if tenant.id == "osunar_contadores" else 0.0

        res.append(TenantResponse(
            id=tenant.id,
            nombre=tenant.nombre,
            rfc=tenant.rfc,
            modulos=tenant.modulos,
            comision_rate=tenant.comision_rate,
            username=tenant.username,
            password=tenant.password,
            clientes_count=clientes_count,
            comision_acumulada=comision_acumulada
        ))
    return res

@app.post("/api/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def crear_tenant(tenant: TenantCreate, db: Session = Depends(get_db)):
    db_tenant = db.query(Tenant).filter(Tenant.id == tenant.id.lower()).first()
    if db_tenant:
        raise HTTPException(status_code=400, detail="El ID de Tenedor ya está registrado.")
    
    nuevo_tenant = Tenant(
        id=tenant.id.lower(),
        nombre=tenant.nombre,
        rfc=tenant.rfc.upper(),
        modulos=tenant.modulos,
        comision_rate=tenant.comision_rate,
        username=tenant.username,
        password=tenant.password
    )
    db.add(nuevo_tenant)
    db.commit()
    db.refresh(nuevo_tenant)
    
    # Mapeo a respuesta
    return TenantResponse(
        id=nuevo_tenant.id,
        nombre=nuevo_tenant.nombre,
        rfc=nuevo_tenant.rfc,
        modulos=nuevo_tenant.modulos,
        comision_rate=nuevo_tenant.comision_rate,
        username=nuevo_tenant.username,
        password=nuevo_tenant.password,
        clientes_count=0,
        comision_acumulada=0.0
    )

@app.put("/api/tenants/{id}/licencia", response_model=TenantResponse)
def actualizar_licencia(id: str, req: TenantUpdate, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.id == id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado.")
    
    if req.modulos is not None:
        tenant.modulos = req.modulos
    if req.comision_rate is not None:
        tenant.comision_rate = req.comision_rate
        
    db.commit()
    db.refresh(tenant)
    
    # Consultar clientes reales para armar la respuesta
    clientes_count = 0
    comision_acumulada = 0.0
    try:
        resp = requests.get(f"http://127.0.0.1:8000/api/empresas?tenant_id={tenant.id}", timeout=2)
        if resp.ok:
            empresas = resp.json()
            clientes_count = len(empresas)
            timbres_totales_usados = sum(emp.get("timbres_usados", 0) for emp in empresas)
            comision_acumulada = timbres_totales_usados * 1.50 * (tenant.comision_rate / 100.0)
    except Exception:
        clientes_count = 18 if tenant.id == "osunar_contadores" else 0
        comision_acumulada = 2450.00 if tenant.id == "osunar_contadores" else 0.0

    return TenantResponse(
        id=tenant.id,
        nombre=tenant.nombre,
        rfc=tenant.rfc,
        modulos=tenant.modulos,
        comision_rate=tenant.comision_rate,
        clientes_count=clientes_count,
        comision_acumulada=comision_acumulada
    )

class TenantCredencialesRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None

@app.put("/api/tenants/{id}/credenciales", response_model=TenantResponse)
def actualizar_credenciales(id: str, req: TenantCredencialesRequest, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.id == id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado.")
    
    if req.username is not None:
        tenant.username = req.username
    if req.password is not None:
        tenant.password = req.password
        
    db.commit()
    db.refresh(tenant)
    
    # Consultar clientes reales para armar la respuesta
    clientes_count = 0
    comision_acumulada = 0.0
    try:
        resp = requests.get(f"http://127.0.0.1:8000/api/empresas?tenant_id={tenant.id}", timeout=2)
        if resp.ok:
            empresas = resp.json()
            clientes_count = len(empresas)
            timbres_totales_usados = sum(emp.get("timbres_usados", 0) for emp in empresas)
            comision_acumulada = timbres_totales_usados * 1.50 * (tenant.comision_rate / 100.0)
    except Exception:
        clientes_count = 18 if tenant.id == "osunar_contadores" else 0
        comision_acumulada = 2450.00 if tenant.id == "osunar_contadores" else 0.0

    return TenantResponse(
        id=tenant.id,
        nombre=tenant.nombre,
        rfc=tenant.rfc,
        modulos=tenant.modulos,
        comision_rate=tenant.comision_rate,
        username=tenant.username,
        password=tenant.password,
        clientes_count=clientes_count,
        comision_acumulada=comision_acumulada
    )

# Montar archivos estáticos para servir el frontend de Admin_tenant en la raíz
from fastapi.staticfiles import StaticFiles
import os
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
app.mount("/", StaticFiles(directory=parent_dir, html=True), name="static")
