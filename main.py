import os
import requests

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel

# Charger les variables du fichier .env
load_dotenv()

# Créer l'application FastAPI
app = FastAPI(
    title="PayPal Sandbox API",
    description="API FastAPI pour les paiements PayPal Sandbox",
    version="1.0.0"
)

# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# CONFIGURATION PAYPAL
# =========================================================

PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")

PAYPAL_BASE_URL = "https://api-m.sandbox.paypal.com"


class CreateOrderRequest(BaseModel):
    plan: str = "premium"
    amount: float | None = None
    currency: str = "EUR"


# =========================================================
# OBTENIR LE TOKEN PAYPAL
# =========================================================

def get_paypal_access_token():

    if not PAYPAL_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="PAYPAL_CLIENT_ID manquant dans le fichier .env"
        )

    if not PAYPAL_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="PAYPAL_CLIENT_SECRET manquant dans le fichier .env"
        )

    try:

        response = requests.post(
            f"{PAYPAL_BASE_URL}/v1/oauth2/token",
            auth=(
                PAYPAL_CLIENT_ID,
                PAYPAL_CLIENT_SECRET
            ),
            headers={
                "Accept": "application/json",
                "Accept-Language": "en_US"
            },
            data={
                "grant_type": "client_credentials"
            },
            timeout=30
        )

    except requests.RequestException as e:

        raise HTTPException(
            status_code=500,
            detail=f"Impossible de contacter PayPal : {str(e)}"
        )

    if response.status_code != 200:

        raise HTTPException(
            status_code=500,
            detail=f"Erreur authentification PayPal : {response.text}"
        )

    try:

        data = response.json()

        return data["access_token"]

    except Exception:

        raise HTTPException(
            status_code=500,
            detail="PayPal n'a pas retourné de token valide"
        )


# =========================================================
# PAGE D'ACCUEIL
# =========================================================

@app.get("/")
def home():

    return {
        "status": "ok",
        "message": "PayPal API fonctionne",
        "paypal": "Sandbox"
    }


# =========================================================
# TEST DE CONNEXION PAYPAL
# =========================================================

@app.get("/paypal/token-test")
def token_test():

    token = get_paypal_access_token()

    return {
        "success": True,
        "message": "Connexion PayPal réussie"
    }


# =========================================================
# CREER UNE COMMANDE PAYPAL
# =========================================================

@app.post("/paypal/create-order")
def create_order(request: CreateOrderRequest | None = None):

    token = get_paypal_access_token()

    plan_amounts = {"basic": "5.00", "premium": "10.00"}
    plan = request.plan if request else "premium"
    if plan not in plan_amounts:
        raise HTTPException(status_code=400, detail="Plan PayPal invalide")

    order_data = {

        "intent": "CAPTURE",

        "purchase_units": [

            {
                "amount": {

                    "currency_code": "EUR",

                    "value": plan_amounts[plan]

                }
            }

        ]

    }

    try:

        response = requests.post(

            f"{PAYPAL_BASE_URL}/v2/checkout/orders",

            headers={

                "Content-Type": "application/json",

                "Authorization": f"Bearer {token}"

            },

            json=order_data,

            timeout=30

        )

    except requests.RequestException as e:

        raise HTTPException(

            status_code=500,

            detail=f"Impossible de contacter PayPal : {str(e)}"

        )

    if response.status_code not in [200, 201]:

        raise HTTPException(

            status_code=response.status_code,

            detail=f"Erreur création commande PayPal : {response.text}"

        )

    try:

        return response.json()

    except Exception:

        raise HTTPException(

            status_code=500,

            detail="Réponse PayPal invalide"

        )


# =========================================================
# CAPTURER LE PAIEMENT
# =========================================================

@app.post("/paypal/capture-order/{order_id}")
def capture_order(order_id: str):

    if not order_id:

        raise HTTPException(

            status_code=400,

            detail="order_id manquant"

        )

    token = get_paypal_access_token()

    try:

        response = requests.post(

            f"{PAYPAL_BASE_URL}/v2/checkout/orders/{order_id}/capture",

            headers={

                "Content-Type": "application/json",

                "Authorization": f"Bearer {token}"

            },

            timeout=30

        )

    except requests.RequestException as e:

        raise HTTPException(

            status_code=500,

            detail=f"Impossible de contacter PayPal : {str(e)}"

        )

    if response.status_code not in [200, 201]:

        raise HTTPException(

            status_code=response.status_code,

            detail=f"Erreur capture PayPal : {response.text}"

        )

    try:

        return response.json()

    except Exception:

        raise HTTPException(

            status_code=500,

            detail="Réponse PayPal invalide"

        )