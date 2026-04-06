# Import all reports so @register decorators fire
from apps.reports.reports.orders_by_status import *  # noqa: F401, F403
from apps.reports.reports.orders_by_manager import *  # noqa: F401, F403
from apps.reports.reports.orders_by_customer import *  # noqa: F401, F403
from apps.reports.reports.overdue_orders import *  # noqa: F401, F403
from apps.reports.reports.orders_timeline import *  # noqa: F401, F403
from apps.reports.reports.contract_payments import *  # noqa: F401, F403
from apps.reports.reports.reference_export import *  # noqa: F401, F403
