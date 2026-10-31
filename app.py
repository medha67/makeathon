from flask import Flask, render_template, request, redirect, url_for, session, flash
import sqlite3
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

app = Flask(__name__)
app.secret_key = "lastcall-secret-key-change-later"

DB = Path(__file__).parent / "lastcall.db"

# Database fields for each module
MODULES = {
    "customers": ["name", "email", "company", "phone"],
    "products": ["name", "category", "price"],
    "plans": ["name", "price", "billing_cycle", "description"],
    "subscriptions": ["customer", "plan", "start_date", "renewal_date", "amount", "status"],
    "quotations": ["customer", "quotation_date", "amount", "status"],
    "invoices": ["customer", "invoice_date", "due_date", "amount", "status"],
    "discounts": ["code", "discount_type", "value", "start_date", "end_date"],
    "payments": ["invoice", "method", "amount", "payment_date", "status"]
}

LABELS = {
    "customers": "Customers",
    "products": "Products",
    "plans": "Plans",
    "subscriptions": "Subscriptions",
    "quotations": "Quotations",
    "invoices": "Invoices",
    "discounts": "Discounts",
    "payments": "Payments"
}


def get_db():
    connection = sqlite3.connect(DB)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    DB.parent.mkdir(parents=True, exist_ok=True)

    with get_db() as db:

        db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        """)

        for table, fields in MODULES.items():

            columns = ", ".join(
                f'"{field}" TEXT' for field in fields
            )

            db.execute(f"""
                CREATE TABLE IF NOT EXISTS "{table}" (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    {columns}
                )
            """)


initialize_database()


# Login protection
def login_required(function):

    @wraps(function)
    def wrapper(*args, **kwargs):

        if "user_id" not in session:
            return redirect(url_for("login"))

        return function(*args, **kwargs)

    return wrapper


# Home page
@app.route("/")
def home():

    if "user_id" in session:
        return redirect(url_for("dashboard"))

    return redirect(url_for("login"))


# Registration
@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "POST":

        name = request.form["name"]
        email = request.form["email"]
        password = request.form["password"]

        if len(password) < 6:
            flash("Password must contain at least 6 characters.")
            return redirect(url_for("register"))

        try:

            with get_db() as db:

                cursor = db.execute("""
                    INSERT INTO users(name, email, password)
                    VALUES (?, ?, ?)
                """, (
                    name,
                    email,
                    generate_password_hash(password)
                ))

                session["user_id"] = cursor.lastrowid
                session["user_name"] = name

            return redirect(url_for("dashboard"))

        except sqlite3.IntegrityError:

            flash("Email already registered.")

    return render_template("register.html")


# Login
@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        email = request.form["email"]
        password = request.form["password"]

        with get_db() as db:

            user = db.execute(
                "SELECT * FROM users WHERE email = ?",
                (email,)
            ).fetchone()

        if user and check_password_hash(user["password"], password):

            session["user_id"] = user["id"]
            session["user_name"] = user["name"]

            return redirect(url_for("dashboard"))

        flash("Invalid email or password.")

    return render_template("login.html")


# Logout
@app.route("/logout")
def logout():

    session.clear()

    return redirect(url_for("login"))


# Dashboard
@app.route("/dashboard")
@login_required
def dashboard():

    stats = {}

    with get_db() as db:

        for table in MODULES:

            stats[table] = db.execute(
                f'SELECT COUNT(*) FROM "{table}"'
            ).fetchone()[0]

        recent = db.execute("""
            SELECT * FROM subscriptions
            ORDER BY id DESC LIMIT 5
        """).fetchall()

    return render_template(
        "dashboard.html",
        stats=stats,
        recent=recent
    )


# All management modules
@app.route("/<page>", methods=["GET", "POST"])
@login_required
def module(page):

    if page not in MODULES:
        return "Page not found", 404

    fields = MODULES[page]

    if request.method == "POST":

        values = [
            request.form.get(field, "").strip()
            for field in fields
        ]

        if not all(values):
            flash("Please complete all fields.")
            return redirect(url_for("module", page=page))

        columns = ", ".join(f'"{field}"' for field in fields)
        placeholders = ", ".join("?" for field in fields)

        with get_db() as db:

            db.execute(
                f'INSERT INTO "{page}" ({columns}) VALUES ({placeholders})',
                values
            )

        flash("Record added successfully!")

        return redirect(url_for("module", page=page))

    with get_db() as db:

        records = db.execute(
            f'SELECT * FROM "{page}" ORDER BY id DESC'
        ).fetchall()

    return render_template(
        f"{page}.html",
        page=page,
        title=LABELS[page],
        fields=fields,
        records=records
    )


# Delete records
@app.route("/delete/<page>/<int:record_id>", methods=["POST"])
@login_required
def delete_record(page, record_id):

    if page not in MODULES:
        return "Page not found", 404

    with get_db() as db:

        db.execute(
            f'DELETE FROM "{page}" WHERE id = ?',
            (record_id,)
        )

    flash("Record deleted successfully!")

    return redirect(url_for("module", page=page))


# Reports
@app.route("/reports")
@login_required
def reports():

    with get_db() as db:

        counts = {}

        for table in MODULES:

            counts[table] = db.execute(
                f'SELECT COUNT(*) FROM "{table}"'
            ).fetchone()[0]

        total_payments = db.execute("""
            SELECT COALESCE(SUM(CAST(amount AS REAL)), 0)
            FROM payments
        """).fetchone()[0]

    return render_template(
        "reports.html",
        counts=counts,
        total_payments=total_payments
    )


# Customer portal
@app.route("/customer-portal")
@login_required
def customer_portal():

    with get_db() as db:

        customers = db.execute(
            "SELECT * FROM customers"
        ).fetchall()

        subscriptions = db.execute(
            "SELECT * FROM subscriptions"
        ).fetchall()

        invoices = db.execute(
            "SELECT * FROM invoices"
        ).fetchall()

    return render_template(
        "customer_portal.html",
        customers=customers,
        subscriptions=subscriptions,
        invoices=invoices
    )


if __name__ == "__main__":
    app.run(debug=True)