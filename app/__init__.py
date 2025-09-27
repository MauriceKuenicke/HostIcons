"""
Flask application factory for the Icon Browser app.
"""
from __future__ import annotations

from datetime import datetime
from flask import Flask
from .routes import main_bp


def create_app() -> Flask:
    """Create and configure the Flask application.

    Returns:
        Flask: Configured Flask application instance.
    """
    app = Flask(
        __name__,
        static_folder="static",
        template_folder="templates",
    )

    # Basic config
    app.config.update(
        JSON_SORT_KEYS=False,
        SEND_FILE_MAX_AGE_DEFAULT=60,
        APP_START_TIME=datetime.utcnow().isoformat() + "Z",
    )

    # Register blueprints
    app.register_blueprint(main_bp)

    return app
