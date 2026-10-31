from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

from .config import Settings

logger = logging.getLogger("app.mail")

SMTP_TIMEOUT_SECONDS = 10


class MailError(Exception):
    """Raised when a transactional email could not be handed to the SMTP server."""


def _login_code_message(settings: Settings, to: str, code: str) -> EmailMessage:
    minutes = max(1, settings.email_code_ttl_seconds // 60)
    message = EmailMessage()
    message["Subject"] = f"【序】登录验证码：{code}"
    message["From"] = formataddr((settings.mail_from_name, settings.mail_from))
    message["To"] = to
    message.set_content(
        "\n".join(
            [
                "你好，",
                "",
                f"你的登录验证码是：{code}",
                "",
                f"验证码 {minutes} 分钟内有效，仅可使用一次。",
                "若非本人操作，请忽略这封邮件。",
                "",
                "— 序",
            ]
        )
    )
    return message


def send_login_code(settings: Settings, to: str, code: str) -> None:
    """Send a login code, or log it when running without SMTP in development."""
    if not settings.mail_configured:
        if settings.is_production:
            raise MailError("mail is not configured")
        logger.warning("[mail] dev mode, login code for %s is %s", to, code)
        return

    message = _login_code_message(settings, to, code)
    context = ssl.create_default_context()

    try:
        if settings.mail_ssl:
            with smtplib.SMTP_SSL(
                settings.mail_host,
                settings.mail_port,
                timeout=SMTP_TIMEOUT_SECONDS,
                context=context,
            ) as smtp:
                if settings.mail_username:
                    smtp.login(settings.mail_username, settings.mail_password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(
                settings.mail_host,
                settings.mail_port,
                timeout=SMTP_TIMEOUT_SECONDS,
            ) as smtp:
                smtp.ehlo()
                if settings.mail_starttls:
                    smtp.starttls(context=context)
                    smtp.ehlo()
                if settings.mail_username:
                    smtp.login(settings.mail_username, settings.mail_password)
                smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        # Never log credentials or the code itself on failure.
        logger.error("failed to send login code via %s: %s", settings.mail_host, exc)
        raise MailError("send failed") from exc
