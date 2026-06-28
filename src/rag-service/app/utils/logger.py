import logging
import json
import sys


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log: dict = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }
        for key in ("submission_id", "error", "model", "prompt_tokens", "eval_tokens", "prompt_duration_ms", "eval_duration_ms", "total_duration_ms", "prompt_chars", "rule_chars"):
            if hasattr(record, key):
                log[key] = getattr(record, key)  # type: ignore[attr-defined]
        if record.exc_info:
            log["exception"] = self.formatException(record.exc_info)
        return json.dumps(log)


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger
