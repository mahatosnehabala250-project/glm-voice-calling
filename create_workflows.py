#!/usr/bin/env python3
"""Create all 7 VoiceAI n8n workflows via the n8n REST API."""

import json
import subprocess
import sys
import time

N8N_BASE = "https://n8n.srv1347095.hstgr.cloud"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1M2Y5MDE1YS01M2E1LTQ3NTItYWVlYy05NDllYjViMTkyZmEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNDY2NTY5YjMtYTE3YS00MTNiLTg1MTktNzk1NzA2MGQ1ZTY0IiwiaWF0IjoxNzc2ODI4ODQ4fQ.8tqAiaPoWkpen0XV0fusV_rRecbGvOyFojM-A9VmYs8"

SUPABASE_URL = "https://qgybxpteqzhcvlgdfxbn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneWJ4cHRlcXpoY3ZsZ2RmeGJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjU0NTA4MSwiZXhwIjoyMDkyMTIxMDgxfQ.tMkUNh1GxpjbHXsG_1Nrf-wP1nF6ZObfBc22VNPpqv8"

def supabase_headers():
    """Return standard Supabase auth headers for HTTP Request node."""
    return {
        "parameters": [
            {"name": "apikey", "value": SUPABASE_KEY},
            {"name": "Authorization", "value": f"Bearer {SUPABASE_KEY}"},
            {"name": "Content-Type", "value": "application/json"},
            {"name": "Prefer", "value": "return=representation"}
        ]
    }

def create_n8n_workflow(workflow_data):
    """Create a workflow via n8n API using curl. Returns the response JSON."""
    # Remove read-only fields - they can't be set during creation
    workflow_data.pop('active', None)
    workflow_data.pop('tags', None)
    payload = json.dumps(workflow_data)
    cmd = [
        "curl", "--max-time", "60", "-s", "-X", "POST",
        f"{N8N_BASE}/api/v1/workflows",
        "-H", f"X-N8N-API-KEY: {N8N_API_KEY}",
        "-H", "Content-Type: application/json",
        "-d", payload
    ]
    print(f"  Running curl for: {workflow_data['name']}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ERROR: curl failed: {result.stderr}")
        return None
    try:
        resp = json.loads(result.stdout)
        return resp
    except json.JSONDecodeError:
        print(f"  ERROR: Could not parse response: {result.stdout[:500]}")
        return None

def activate_workflow(workflow_id):
    """Activate a workflow via n8n API."""
    cmd = [
        "curl", "--max-time", "60", "-s", "-X", "POST",
        f"{N8N_BASE}/api/v1/workflows/{workflow_id}/activate",
        "-H", f"X-N8N-API-KEY: {N8N_API_KEY}"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ERROR activating {workflow_id}: {result.stderr}")
        return False
    try:
        resp = json.loads(result.stdout)
        return resp.get("active", False)
    except:
        return False

def update_tags(workflow_id):
    """Add voiceai tag to a workflow via PUT update."""
    # First, get the full workflow
    cmd_get = [
        "curl", "--max-time", "60", "-s", "-X", "GET",
        f"{N8N_BASE}/api/v1/workflows/{workflow_id}",
        "-H", f"X-N8N-API-KEY: {N8N_API_KEY}"
    ]
    result = subprocess.run(cmd_get, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"    ERROR getting workflow: {result.stderr}")
        return False
    try:
        wf = json.loads(result.stdout)
    except:
        return False

    # Add tags
    wf["tags"] = [{"name": "voiceai", "id": "bmLJGeX8dmhk8gtq"}]

    # Update via PUT
    cmd_put = [
        "curl", "--max-time", "60", "-s", "-X", "PUT",
        f"{N8N_BASE}/api/v1/workflows/{workflow_id}",
        "-H", f"X-N8N-API-KEY: {N8N_API_KEY}",
        "-H", "Content-Type: application/json",
        "-d", json.dumps(wf)
    ]
    result = subprocess.run(cmd_put, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"    ERROR updating tags: {result.stderr}")
        return False
    try:
        resp = json.loads(result.stdout)
        if "message" in resp and "error" in resp["message"].lower():
            print(f"    Tag update error: {resp['message']}")
            return False
        return True
    except:
        return False

# ========================================================================
# WORKFLOW 1: Appointment Booking Handler
# ========================================================================
def workflow_1():
    nodes = [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "voiceai-booking",
                "responseMode": "onReceived",
                "options": {}
            },
            "id": "webhook-1",
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [250, 300],
            "webhookId": "voiceai-booking-hook"
        },
        {
            "parameters": {
                "jsCode": """// Parse and validate booking request
const body = $input.first().json.body || $input.first().json;

const event = body.event;
const callSid = body.callSid || '';
const clinicId = body.clinicId || '';
const clinicName = body.clinicName || '';
const callerPhone = body.callerPhone || '';
const callerName = body.callerName || '';
const speechText = body.speechText || '';
const timestamp = body.timestamp || new Date().toISOString();

// Try to extract structured info from speechText
// Simple extraction - in production this would use NLP
const dateMatch = speechText.match(/(\\d{4}-\\d{2}-\\d{2}|tomorrow|today|next week)/i);
const timeMatch = speechText.match(/(\\d{1,2}[:\\.]?\\d{0,2}\\s*(?:am|pm)?|morning|afternoon|evening)/i);

let date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
let time = timeMatch ? timeMatch[1] : '10:00';
const patientName = callerName || 'Walk-in Patient';
const reason = speechText.substring(0, 200) || 'General consultation';

return [{
  json: {
    clinicId,
    clinicName,
    patientName,
    patientPhone: callerPhone,
    date,
    time,
    reason,
    callSid,
    timestamp,
    event
  }
}];"""
            },
            "id": "code-parse-1",
            "name": "Parse Booking Request",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [470, 300]
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{SUPABASE_URL}/rest/v1/appointments",
                "authentication": "none",
                "sendHeaders": True,
                "headerParameters": supabase_headers(),
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": '={{ JSON.stringify({ clinic_id: $json.clinicId, patient_name: $json.patientName, patient_phone: $json.patientPhone, date: $json.date, time: $json.time, reason: $json.reason, status: "confirmed", booked_via: "ai", clinic_name: $json.clinicName, created_at: $json.timestamp }) }}',
                "options": {}
            },
            "id": "http-create-apt-1",
            "name": "Create Appointment",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [690, 300]
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{SUPABASE_URL}/rest/v1/notifications",
                "authentication": "none",
                "sendHeaders": True,
                "headerParameters": supabase_headers(),
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": '={{ JSON.stringify({ clinic_id: $json.clinicId, type: "appointment_booked", title: "New AI Booking", message: "Appointment booked by " + $json.patientName + " at " + $json.time + " on " + $json.date, data: { patientPhone: $json.patientPhone, callSid: $json.callSid } }) }}',
                "options": {}
            },
            "id": "http-notify-1",
            "name": "Create Notification",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [910, 300]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": '={{ JSON.stringify({ success: true, appointmentId: ($("Create Appointment").first().json.id || $("Create Appointment").first().json[0]?.id || "unknown"), message: "Appointment booked successfully", clinicName: $json.clinicName, date: $json.date, time: $json.time }) }}',
                "options": {}
            },
            "id": "respond-1",
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [1130, 300]
        }
    ]
    connections = {
        "Webhook": {"main": [[{"node": "Parse Booking Request", "type": "main", "index": 0}]]},
        "Parse Booking Request": {"main": [[{"node": "Create Appointment", "type": "main", "index": 0}]]},
        "Create Appointment": {"main": [[{"node": "Create Notification", "type": "main", "index": 0}]]},
        "Create Notification": {"main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]}
    }
    return {
        "name": "VoiceAI — Appointment Booking Handler",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
        "tags": [{"name": "voiceai"}]
    }

# ========================================================================
# WORKFLOW 2: Check Availability
# ========================================================================
def workflow_2():
    nodes = [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "voiceai-check-availability",
                "responseMode": "onReceived",
                "options": {}
            },
            "id": "webhook-2",
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [250, 300],
            "webhookId": "voiceai-check-availability-hook"
        },
        {
            "parameters": {
                "jsCode": """const body = $input.first().json.body || $input.first().json;
const clinicId = body.clinicId || body.clinic_id || '';
const date = body.date || new Date().toISOString().split('T')[0];

return [{ json: { clinicId, date } }];"""
            },
            "id": "code-parse-2",
            "name": "Extract Parameters",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [470, 300]
        },
        {
            "parameters": {
                "method": "GET",
                "url": f"{SUPABASE_URL}/rest/v1/appointments?clinic_id=eq.{{$json.clinicId}}&date=eq.{{$json.date}}&select=*",
                "authentication": "none",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "apikey", "value": SUPABASE_KEY},
                        {"name": "Authorization", "value": f"Bearer {SUPABASE_KEY}"},
                    ]
                },
                "options": {}
            },
            "id": "http-get-2",
            "name": "Get Booked Slots",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [690, 300]
        },
        {
            "parameters": {
                "jsCode": """const booked = $input.first().json;
const items = Array.isArray(booked) ? booked : [booked];
const clinicId = $('Extract Parameters').first().json.clinicId;
const date = $('Extract Parameters').first().json.date;

// Generate all possible 30-min slots from 8AM to 8PM
const allSlots = [];
for (let h = 8; h < 20; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    allSlots.push(hh + ':' + mm);
  }
}

// Extract booked times
const bookedTimes = new Set();
items.forEach(item => {
  if (item.time && item.status !== 'cancelled') {
    bookedTimes.add(String(item.time).substring(0, 5));
  }
});

const availableSlots = allSlots.filter(s => !bookedTimes.has(s));
const bookedSlots = allSlots.filter(s => bookedTimes.has(s));

return [{
  json: {
    success: true,
    clinicId,
    date,
    availableSlots,
    bookedSlots,
    totalAvailable: availableSlots.length,
    totalBooked: bookedSlots.length
  }
}];"""
            },
            "id": "code-calc-2",
            "name": "Calculate Available Slots",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [910, 300]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": '={{ JSON.stringify($json) }}',
                "options": {}
            },
            "id": "respond-2",
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [1130, 300]
        }
    ]
    connections = {
        "Webhook": {"main": [[{"node": "Extract Parameters", "type": "main", "index": 0}]]},
        "Extract Parameters": {"main": [[{"node": "Get Booked Slots", "type": "main", "index": 0}]]},
        "Get Booked Slots": {"main": [[{"node": "Calculate Available Slots", "type": "main", "index": 0}]]},
        "Calculate Available Slots": {"main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]}
    }
    return {
        "name": "VoiceAI — Check Availability",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
        "tags": [{"name": "voiceai"}]
    }

# ========================================================================
# WORKFLOW 3: Reschedule Appointment
# ========================================================================
def workflow_3():
    nodes = [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "voiceai-reschedule",
                "responseMode": "onReceived",
                "options": {}
            },
            "id": "webhook-3",
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [250, 300],
            "webhookId": "voiceai-reschedule-hook"
        },
        {
            "parameters": {
                "jsCode": """const body = $input.first().json.body || $input.first().json;
return [{ json: { ...body } }];"""
            },
            "id": "code-parse-3",
            "name": "Parse Reschedule Request",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [470, 300]
        },
        {
            "parameters": {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict"
                    },
                    "conditions": [
                        {
                            "id": "condition-3",
                            "leftValue": "={{ $json.appointmentId }}",
                            "rightValue": "",
                            "operator": {
                                "type": "string",
                                "operation": "notEquals",
                                "name": "filters.operation.notEquals"
                            }
                        }
                    ],
                    "combinator": "and"
                },
                "options": {}
            },
            "id": "if-3",
            "name": "Has Appointment ID?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [690, 300]
        },
        {
            "parameters": {
                "method": "GET",
                "url": f"{SUPABASE_URL}/rest/v1/appointments?clinic_id=eq.{{$json.clinicId}}&patient_phone=eq.{{$json.callerPhone}}&status=eq.confirmed&select=*&order=created_at.desc&limit=1",
                "authentication": "none",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "apikey", "value": SUPABASE_KEY},
                        {"name": "Authorization", "value": f"Bearer {SUPABASE_KEY}"},
                    ]
                },
                "options": {}
            },
            "id": "http-find-3",
            "name": "Find Existing Appointment",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [910, 180]
        },
        {
            "parameters": {
                "jsCode": """// If appointmentId was provided, use it; otherwise get from search result
const parsed = $('Parse Reschedule Request').first().json;
const searchResult = $('Find Existing Appointment').first().json;
const items = Array.isArray(searchResult) ? searchResult : [searchResult];
const found = items[0];

const appointmentId = parsed.appointmentId || (found && found.id) || null;

if (!appointmentId) {
  return [{ json: { success: false, error: "No appointment found to reschedule" } }];
}

return [{ json: { appointmentId, clinicId: parsed.clinicId, newDate: parsed.newDate, newTime: parsed.newTime, callerPhone: parsed.callerPhone } }];"""
            },
            "id": "code-resolve-3",
            "name": "Resolve Appointment ID",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1130, 300]
        },
        {
            "parameters": {
                "method": "PATCH",
                "url": f"{SUPABASE_URL}/rest/v1/appointments?id=eq.{{$json.appointmentId}}",
                "authentication": "none",
                "sendHeaders": True,
                "headerParameters": supabase_headers(),
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": '={{ JSON.stringify({ date: $json.newDate, time: $json.newTime, status: "rescheduled", updated_at: new Date().toISOString() }) }}',
                "options": {}
            },
            "id": "http-patch-3",
            "name": "Update Appointment",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1350, 300]
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{SUPABASE_URL}/rest/v1/notifications",
                "authentication": "none",
                "sendHeaders": True,
                "headerParameters": supabase_headers(),
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": '={{ JSON.stringify({ clinic_id: $json.clinicId, type: "appointment_rescheduled", title: "Appointment Rescheduled", message: "Appointment " + $json.appointmentId + " rescheduled to " + $json.newDate + " at " + $json.newTime }) }}',
                "options": {}
            },
            "id": "http-notify-3",
            "name": "Create Notification",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1570, 300]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": '={{ JSON.stringify({ success: true, updatedAppointment: { id: $json.appointmentId, newDate: $json.newDate, newTime: $json.newTime }, message: "Appointment rescheduled successfully" }) }}',
                "options": {}
            },
            "id": "respond-3",
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [1790, 300]
        }
    ]
    connections = {
        "Webhook": {"main": [[{"node": "Parse Reschedule Request", "type": "main", "index": 0}]]},
        "Parse Reschedule Request": {"main": [[{"node": "Has Appointment ID?", "type": "main", "index": 0}]]},
        "Has Appointment ID?": {
            "main": [
                [{"node": "Resolve Appointment ID", "type": "main", "index": 0}],  # true - has ID
                [{"node": "Find Existing Appointment", "type": "main", "index": 0}]   # false - need to find
            ]
        },
        "Find Existing Appointment": {"main": [[{"node": "Resolve Appointment ID", "type": "main", "index": 0}]]},
        "Resolve Appointment ID": {"main": [[{"node": "Update Appointment", "type": "main", "index": 0}]]},
        "Update Appointment": {"main": [[{"node": "Create Notification", "type": "main", "index": 0}]]},
        "Create Notification": {"main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]}
    }
    return {
        "name": "VoiceAI — Reschedule Appointment",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
        "tags": [{"name": "voiceai"}]
    }

# ========================================================================
# WORKFLOW 4: Cancel Appointment
# ========================================================================
def workflow_4():
    nodes = [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "voiceai-cancel",
                "responseMode": "onReceived",
                "options": {}
            },
            "id": "webhook-4",
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [250, 300],
            "webhookId": "voiceai-cancel-hook"
        },
        {
            "parameters": {
                "jsCode": """const body = $input.first().json.body || $input.first().json;
return [{ json: { ...body } }];"""
            },
            "id": "code-parse-4",
            "name": "Parse Cancel Request",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [470, 300]
        },
        {
            "parameters": {
                "method": "PATCH",
                "url": f"{SUPABASE_URL}/rest/v1/appointments?id=eq.{{$json.appointmentId}}",
                "authentication": "none",
                "sendHeaders": True,
                "headerParameters": supabase_headers(),
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": '={{ JSON.stringify({ status: "cancelled", updated_at: new Date().toISOString() }) }}',
                "options": {}
            },
            "id": "http-cancel-4",
            "name": "Cancel Appointment",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [690, 300]
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{SUPABASE_URL}/rest/v1/notifications",
                "authentication": "none",
                "sendHeaders": True,
                "headerParameters": supabase_headers(),
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": '={{ JSON.stringify({ clinic_id: $json.clinicId, type: "appointment_cancelled", title: "Appointment Cancelled", message: "Appointment " + ($json.appointmentId || "N/A") + " has been cancelled by patient " + ($json.callerPhone || "N/A") }) }}',
                "options": {}
            },
            "id": "http-notify-4",
            "name": "Create Notification",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [910, 300]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": '={{ JSON.stringify({ success: true, message: "Appointment cancelled successfully", appointmentId: $json.appointmentId }) }}',
                "options": {}
            },
            "id": "respond-4",
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [1130, 300]
        }
    ]
    connections = {
        "Webhook": {"main": [[{"node": "Parse Cancel Request", "type": "main", "index": 0}]]},
        "Parse Cancel Request": {"main": [[{"node": "Cancel Appointment", "type": "main", "index": 0}]]},
        "Cancel Appointment": {"main": [[{"node": "Create Notification", "type": "main", "index": 0}]]},
        "Create Notification": {"main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]}
    }
    return {
        "name": "VoiceAI — Cancel Appointment",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
        "tags": [{"name": "voiceai"}]
    }

# ========================================================================
# WORKFLOW 5: Call Transfer & Escalation
# ========================================================================
def workflow_5():
    nodes = [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "voiceai-escalation",
                "responseMode": "onReceived",
                "options": {}
            },
            "id": "webhook-5",
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [250, 300],
            "webhookId": "voiceai-escalation-hook"
        },
        {
            "parameters": {
                "jsCode": """const body = $input.first().json.body || $input.first().json;
const sentiment = (body.sentiment || 'neutral').toLowerCase();
const reason = (body.reason || body.speechText || '').toLowerCase();
const eventType = body.event || 'transfer';

// Categorize escalation
let category = 'general_inquiry';
let priority = 'low';
let transferTo = 'reception';

if (sentiment === 'negative' || sentiment === 'angry' || sentiment === 'frustrated') {
  category = 'complaint';
  priority = 'high';
  transferTo = 'manager';
}

if (reason.includes('emergency') || reason.includes('urgent') || reason.includes('pain') || reason.includes('bleeding')) {
  category = 'emergency';
  priority = 'critical';
  transferTo = 'doctor';
}

if (reason.includes('complaint') || reason.includes('unhappy') || reason.includes('bad')) {
  category = 'complaint';
  priority = 'high';
  transferTo = 'manager';
}

if (reason.includes('billing') || reason.includes('payment') || reason.includes('insurance') || reason.includes('cost')) {
  category = 'billing';
  priority = 'medium';
  transferTo = 'billing';
}

const alertMessage = `[${priority.toUpperCase()}] ${category.replace('_', ' ')} from ${body.callerPhone || 'unknown'}: ${body.speechText || reason || 'No details'}`;

return [{
  json: {
    ...body,
    category,
    priority,
    transferTo,
    alertMessage,
    eventType
  }
}];"""
            },
            "id": "code-categorize-5",
            "name": "Categorize Escalation",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [470, 300]
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{SUPABASE_URL}/rest/v1/notifications",
                "authentication": "none",
                "sendHeaders": True,
                "headerParameters": supabase_headers(),
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": '={{ JSON.stringify({ clinic_id: $json.clinicId, type: "escalation", title: "Call Escalation - " + $json.priority.toUpperCase(), message: $json.alertMessage, data: { callSid: $json.callSid, callerPhone: $json.callerPhone, category: $json.category, sentiment: $json.sentiment, transferTo: $json.transferTo, clinicName: $json.clinicName } }) }}',
                "options": {}
            },
            "id": "http-notify-5",
            "name": "Create Escalation Notification",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [690, 300]
        },
        {
            "parameters": {
                "jsCode": """const data = $input.first().json;
return [{
  json: {
    success: true,
    escalationHandled: true,
    transferTo: data.transferTo,
    category: data.category,
    priority: data.priority,
    message: `Call being transferred to ${data.transferTo}. Priority: ${data.priority}.`
  }
}];"""
            },
            "id": "code-format-5",
            "name": "Format Response",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [910, 300]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": '={{ JSON.stringify($json) }}',
                "options": {}
            },
            "id": "respond-5",
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [1130, 300]
        }
    ]
    connections = {
        "Webhook": {"main": [[{"node": "Categorize Escalation", "type": "main", "index": 0}]]},
        "Categorize Escalation": {"main": [[{"node": "Create Escalation Notification", "type": "main", "index": 0}]]},
        "Create Escalation Notification": {"main": [[{"node": "Format Response", "type": "main", "index": 0}]]},
        "Format Response": {"main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]}
    }
    return {
        "name": "VoiceAI — Call Transfer & Escalation",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
        "tags": [{"name": "voiceai"}]
    }

# ========================================================================
# WORKFLOW 6: Post-Call Summary
# ========================================================================
def workflow_6():
    nodes = [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "voiceai-call-summary",
                "responseMode": "onReceived",
                "options": {}
            },
            "id": "webhook-6",
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [250, 300],
            "webhookId": "voiceai-call-summary-hook"
        },
        {
            "parameters": {
                "jsCode": """const body = $input.first().json.body || $input.first().json;
return [{ json: { ...body } }];"""
            },
            "id": "code-parse-6",
            "name": "Parse Call Summary",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [470, 300]
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{SUPABASE_URL}/rest/v1/calls",
                "authentication": "none",
                "sendHeaders": True,
                "headerParameters": supabase_headers(),
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": '={{ JSON.stringify({ call_sid: $json.callSid, clinic_id: $json.clinicId, caller_phone: $json.callerPhone, duration: $json.duration || 0, transcript: $json.transcript || "", summary: $json.summary || "", sentiment: $json.sentiment || "neutral", intent: $json.intent || "unknown", created_at: $json.timestamp || new Date().toISOString() }) }}',
                "options": {}
            },
            "id": "http-save-call-6",
            "name": "Save Call Record",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [690, 300]
        },
        {
            "parameters": {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict"
                    },
                    "conditions": [
                        {
                            "id": "condition-6",
                            "leftValue": "={{ $json.bookingDetails }}",
                            "rightValue": "",
                            "operator": {
                                "type": "string",
                                "operation": "notEquals",
                                "name": "filters.operation.notEquals"
                            }
                        }
                    ],
                    "combinator": "and"
                },
                "options": {}
            },
            "id": "if-6",
            "name": "Has Booking Details?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [910, 300]
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{SUPABASE_URL}/rest/v1/appointments",
                "authentication": "none",
                "sendHeaders": True,
                "headerParameters": supabase_headers(),
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": '={{ JSON.stringify({ clinic_id: $json.clinicId, patient_name: $json.bookingDetails.patientName || "Unknown", patient_phone: $json.callerPhone, date: $json.bookingDetails.date || new Date().toISOString().split("T")[0], time: $json.bookingDetails.time || "10:00", reason: $json.bookingDetails.service || $json.intent || "General", status: "confirmed", booked_via: "ai", call_sid: $json.callSid }) }}',
                "options": {}
            },
            "id": "http-book-6",
            "name": "Create Appointment from Call",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1130, 180]
        },
        {
            "parameters": {
                "jsCode": """const data = $input.first().json;
return [{
  json: {
    success: true,
    callRecorded: true,
    callSid: data.callSid,
    clinicId: data.clinicId,
    sentiment: data.sentiment,
    intent: data.intent,
    bookingCreated: data.bookingDetails ? true : false,
    analytics: {
      duration: data.duration,
      hasTranscript: !!(data.transcript),
      sentimentScore: data.sentiment
    }
  }
}];"""
            },
            "id": "code-analytics-6",
            "name": "Create Analytics Snapshot",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1350, 300]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": '={{ JSON.stringify($json) }}',
                "options": {}
            },
            "id": "respond-6",
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [1570, 300]
        }
    ]
    connections = {
        "Webhook": {"main": [[{"node": "Parse Call Summary", "type": "main", "index": 0}]]},
        "Parse Call Summary": {"main": [[{"node": "Save Call Record", "type": "main", "index": 0}]]},
        "Save Call Record": {"main": [[{"node": "Has Booking Details?", "type": "main", "index": 0}]]},
        "Has Booking Details?": {
            "main": [
                [{"node": "Create Appointment from Call", "type": "main", "index": 0}],
                [{"node": "Create Analytics Snapshot", "type": "main", "index": 0}]
            ]
        },
        "Create Appointment from Call": {"main": [[{"node": "Create Analytics Snapshot", "type": "main", "index": 0}]]},
        "Create Analytics Snapshot": {"main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]}
    }
    return {
        "name": "VoiceAI — Post-Call Summary",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
        "tags": [{"name": "voiceai"}]
    }

# ========================================================================
# WORKFLOW 7: Test Connectivity
# ========================================================================
def workflow_7():
    nodes = [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "voiceai-test",
                "responseMode": "onReceived",
                "options": {}
            },
            "id": "webhook-7",
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [250, 300],
            "webhookId": "voiceai-test-hook"
        },
        {
            "parameters": {
                "jsCode": """const body = $input.first().json.body || $input.first().json;
return [{
  json: {
    success: true,
    message: "VoiceAI → n8n connection OK",
    n8nVersion: "1.x",
    timestamp: new Date().toISOString(),
    receivedData: body
  }
}];"""
            },
            "id": "code-test-7",
            "name": "Generate Test Response",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [470, 300]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": '={{ JSON.stringify($json) }}',
                "options": {}
            },
            "id": "respond-7",
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [690, 300]
        }
    ]
    connections = {
        "Webhook": {"main": [[{"node": "Generate Test Response", "type": "main", "index": 0}]]},
        "Generate Test Response": {"main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]}
    }
    return {
        "name": "VoiceAI — Test Connectivity",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
        "tags": [{"name": "voiceai"}]
    }

# ========================================================================
# MAIN EXECUTION
# ========================================================================
def main():
    workflows_to_create = [
        ("VoiceAI — Appointment Booking Handler", "voiceai-booking", workflow_1),
        ("VoiceAI — Check Availability", "voiceai-check-availability", workflow_2),
        ("VoiceAI — Reschedule Appointment", "voiceai-reschedule", workflow_3),
        ("VoiceAI — Cancel Appointment", "voiceai-cancel", workflow_4),
        ("VoiceAI — Call Transfer & Escalation", "voiceai-escalation", workflow_5),
        ("VoiceAI — Post-Call Summary", "voiceai-call-summary", workflow_6),
        ("VoiceAI — Test Connectivity", "voiceai-test", workflow_7),
    ]

    results = []
    failures = []

    for name, webhook_path, workflow_fn in workflows_to_create:
        print(f"\n{'='*60}")
        print(f"Creating: {name}")
        print(f"{'='*60}")

        workflow_data = workflow_fn()

        # Try creating (with one retry)
        resp = create_n8n_workflow(workflow_data)
        if resp is None or 'id' not in resp:
            print(f"  RETRYING: {name}")
            time.sleep(2)
            resp = create_n8n_workflow(workflow_data)

        if resp and 'id' in resp:
            wf_id = resp['id']
            webhook_url = f"{N8N_BASE}/webhook/{webhook_path}"
            print(f"  Created! ID: {wf_id}")
            print(f"  Webhook URL: {webhook_url}")

            # Add tags via update
            print(f"  Adding tags...")
            update_tags(wf_id)
            
            # Try to activate
            print(f"  Activating...")
            activated = activate_workflow(wf_id)
            if activated:
                print(f"  ACTIVATED!")
            else:
                print(f"  Activation may have failed, will retry later")

            results.append({
                "name": name,
                "id": wf_id,
                "webhookUrl": webhook_url,
                "active": activated
            })
        else:
            print(f"  FAILED to create: {name}")
            print(f"  Response: {json.dumps(resp, indent=2) if resp else 'No response'}")
            failures.append(name)

    # Retry activations for any that failed
    print(f"\n{'='*60}")
    print("RETRY ACTIVATIONS")
    print(f"{'='*60}")

    for r in results:
        if not r['active']:
            print(f"  Retrying activation for: {r['name']}")
            activated = activate_workflow(r['id'])
            r['active'] = activated
            time.sleep(1)

    # Print summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"  Created: {len(results)}/{len(workflows_to_create)}")
    print(f"  Failed: {len(failures)}")
    if failures:
        print(f"  Failed workflows: {', '.join(failures)}")

    # Write result JSON
    output = {"workflows": results}
    output_path = "/home/z/my-project/n8n-workflows-result.json"
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"\n  Results written to: {output_path}")

    # Also print the JSON
    print(f"\n{json.dumps(output, indent=2)}")

    if failures:
        sys.exit(1)

if __name__ == "__main__":
    main()
