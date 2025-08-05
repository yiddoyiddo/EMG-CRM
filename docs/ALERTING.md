# EMG-CRM Alerting System

## Overview

The reporting suite includes an automated alerting system that monitors key performance indicators and sends notifications when attention is required.

## Alert Categories

### Urgent Alerts
- **Overdue Partner Lists**: When partner lists are past their agreed send date
- **Critical Call Volume**: When weekly calls drop below 25% of target

### High Priority Alerts  
- **Low Call Volume**: When weekly calls are below target but above critical threshold
- **Insufficient Pipeline**: When upcoming calls for next week < 30

### Medium Priority Alerts
- **BDR Support Needed**: When a BDR has performance score < 10 and calls < 5

## Slack Integration

Set the `SLACK_WEBHOOK_URL` environment variable to enable Slack notifications:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Alerts are automatically posted when the `/api/reporting/alerts` endpoint is called.

## Manual Alert Checking

You can manually check for alerts via:

```bash
curl http://localhost:3000/api/reporting/alerts
```

## Alert Frequency

In production, set up a cron job or scheduled task to call the alerts endpoint hourly:

```bash
# Hourly alert check
0 * * * * curl -s http://your-domain.com/api/reporting/alerts >/dev/null 2>&1
``` 