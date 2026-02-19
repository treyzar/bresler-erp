from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """Custom exception handler that wraps errors in a standard format."""
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            "errors": response.data,
            "status_code": response.status_code,
        }

    return response
