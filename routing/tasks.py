from django_apscheduler.jobstores import DjangoJobStore
from apscheduler.schedulers.background import BackgroundScheduler
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Initialize scheduler
scheduler = BackgroundScheduler(settings.SCHEDULER_CONFIG)
scheduler.add_jobstore(DjangoJobStore(), "default")

def refresh_traffic_data():
    """
    Refresh traffic data for popular routes or update cached information.
    In a real-world scenario, this might:
    - Query a traffic API for current conditions on key Harare routes.
    - Update a local cache or database table with congestion data.
    - Recalculate 'popularity' scores for routes based on usage.
    """
    logger.info("Running scheduled job: refresh_traffic_data")

if not settings.DEBUG:
    scheduler.add_job(
        refresh_traffic_data,
        'interval',
        minutes=5,
        id='traffic_refresh',
        replace_existing=True,
        max_instances=1, 
        coalesce=True
    )
    try:
        scheduler.start()
        logger.info("APScheduler started successfully.")
    except Exception as e:
        logger.error(f"Failed to start APScheduler: {e}")