import os
import requests

from fastapi import FastAPI, HTTPException, Header
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
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

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
                },
                "custom_id": plan
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
def capture_order(order_id: str, authorization: str | None = Header(default=None)):

    if not order_id:

        raise HTTPException(

            status_code=400,

            detail="order_id manquant"

        )

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Session Supabase requise pour créditer le compte")
    if not SUPABASE_URL or not SUPABASE_PUBLISHABLE_KEY or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Configuration Supabase manquante sur le backend")

    user_response = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"apikey": SUPABASE_PUBLISHABLE_KEY, "Authorization": authorization},
        timeout=30,
    )
    if user_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Session Supabase invalide ou expirée")
    try:
        user_id = user_response.json()["id"]
    except (ValueError, KeyError):
        raise HTTPException(status_code=401, detail="Identité Supabase invalide")

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
        capture_data = response.json()
    except ValueError:
        raise HTTPException(status_code=500, detail="Réponse PayPal invalide")

    if capture_data.get("status") != "COMPLETED":
        return capture_data
    try:
        amount = capture_data["purchase_units"][0]["payments"]["captures"][0]["amount"]["value"]
    except (KeyError, IndexError, TypeError):
        raise HTTPException(status_code=502, detail="Réponse PayPal incomplète après capture")

    credits = {"5.00": 150, "10.00": 300}.get(str(amount))
    if credits is None:
        raise HTTPException(status_code=400, detail="Montant PayPal non reconnu pour l'attribution des crédits")
    try:
        grant_response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/grant_paypal_credits",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "Content-Type": "application/json",
            },
            json={"_paypal_order_id": order_id, "_user_id": user_id, "_credits": credits},
            timeout=30,
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Impossible d'attribuer les crédits : {str(e)}")
    if grant_response.status_code != 200:
        raise HTTPException(status_code=502, detail="Capture PayPal réussie mais attribution des crédits impossible")
    try:
        added_credits = grant_response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Réponse Supabase invalide lors de l'attribution des crédits")
    return {**capture_data, "credits_added": added_credits}