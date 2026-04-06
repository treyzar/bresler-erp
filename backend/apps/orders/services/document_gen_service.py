"""Service for generating documents from DOCX templates using docxtpl."""

import io
from datetime import date

from docxtpl import DocxTemplate

from apps.orders.models import DocumentTemplate, Order


def get_order_context(order: Order, extra_data: dict | None = None) -> dict:
    """Build template context from order data."""
    context = {
        # Order
        "order_number": order.order_number,
        "order_type": order.get_order_type_display(),
        "status": order.get_status_display(),
        "tender_number": order.tender_number or "",
        "note": order.note or "",
        "start_date": order.start_date.strftime("%d.%m.%Y") if order.start_date else "",
        "ship_date": order.ship_date.strftime("%d.%m.%Y") if order.ship_date else "",
        # Customer
        "customer_name": order.customer_org_unit.name if order.customer_org_unit else "",
        "customer_full_name": order.customer_org_unit.full_name if order.customer_org_unit else "",
        "customer_inn": getattr(order.customer_org_unit, "inn", "") if order.customer_org_unit else "",
        "customer_address": getattr(order.customer_org_unit, "address", "") if order.customer_org_unit else "",
        # Intermediary
        "intermediary_name": order.intermediary.name if order.intermediary else "",
        # Designer
        "designer_name": order.designer.name if order.designer else "",
        # Country
        "country": order.country.name if order.country else "",
        # Managers
        "managers": ", ".join(u.get_full_name() or u.username for u in order.managers.all()),
        # Equipment
        "equipment": ", ".join(e.name for e in order.equipments.all()),
        # Works
        "works": ", ".join(w.name for w in order.works.all()),
        # Facilities
        "facilities": ", ".join(f.name for f in order.facilities.all()),
        # Contacts
        "contacts": [
            {"name": c.full_name, "position": c.position, "email": c.email, "phone": c.phone}
            for c in order.contacts.all()
        ],
        # Today
        "today": date.today().strftime("%d.%m.%Y"),
        "year": str(date.today().year),
    }

    # Contract data
    try:
        contract = order.contract
        context.update({
            "contract_number": contract.contract_number,
            "contract_date": contract.contract_date.strftime("%d.%m.%Y") if contract.contract_date else "",
            "contract_amount": str(contract.amount) if contract.amount else "",
            "advance_percent": str(contract.advance_percent),
            "intermediate_percent": str(contract.intermediate_percent),
            "post_payment_percent": str(contract.post_payment_percent),
            "payment_status": contract.get_status_display(),
        })
    except Order.contract.RelatedObjectDoesNotExist:
        context.update({
            "contract_number": "",
            "contract_date": "",
            "contract_amount": "",
            "advance_percent": "",
            "intermediate_percent": "",
            "post_payment_percent": "",
            "payment_status": "",
        })

    # Merge extra_data (user-provided overrides)
    if extra_data:
        context.update(extra_data)

    return context


def generate_document(order: Order, template: DocumentTemplate, extra_data: dict | None = None) -> io.BytesIO:
    """Generate a DOCX document from a template with order context."""
    context = get_order_context(order, extra_data)

    doc = DocxTemplate(template.template_file.path)
    doc.render(context)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf
