
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "public": {
          Tables: {
            "audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"after_data": Json | null,"before_data": Json | null,"company_id": string,"created_at": string,"entity_id": string | null,"entity_type": string,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"after_data"?: Json | null,"before_data"?: Json | null,"company_id": string,"created_at"?: string,"entity_id"?: string | null,"entity_type": string,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"after_data"?: Json | null,"before_data"?: Json | null,"company_id"?: string,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"id"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"cash_drawer_transactions": {
                  Row: {
                    "amount": number,"company_id": string,"created_at": string,"direction": string,"driver_id": string,"id": string,"kind": string,"notes": string | null,"order_id": string | null,"shift_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"company_id": string,"created_at"?: string,"direction": string,"driver_id": string,"id"?: string,"kind": string,"notes"?: string | null,"order_id"?: string | null,"shift_id": string
                  }
                  Update: {
                    "amount"?: number,"company_id"?: string,"created_at"?: string,"direction"?: string,"driver_id"?: string,"id"?: string,"kind"?: string,"notes"?: string | null,"order_id"?: string | null,"shift_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cash_drawer_transactions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_drawer_transactions_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "driver_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_drawer_transactions_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_drawer_transactions_shift_id_fkey"
      columns: ["shift_id"]
isOneToOne: false
      referencedRelation: "driver_shifts"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "city": string,"created_at": string,"currency_code": string,"display_name": string,"email": string | null,"id": string,"is_active": boolean,"legal_name": string,"logo_url": string | null,"phone": string | null,"slug": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string,"created_at"?: string,"currency_code"?: string,"display_name": string,"email"?: string | null,"id"?: string,"is_active"?: boolean,"legal_name": string,"logo_url"?: string | null,"phone"?: string | null,"slug": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "city"?: string,"created_at"?: string,"currency_code"?: string,"display_name"?: string,"email"?: string | null,"id"?: string,"is_active"?: boolean,"legal_name"?: string,"logo_url"?: string | null,"phone"?: string | null,"slug"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"company_members": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"invited_by": string | null,"is_active": boolean,"joined_at": string,"role": Database["public"]['Enums']["app_role"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"invited_by"?: string | null,"is_active"?: boolean,"joined_at"?: string,"role": Database["public"]['Enums']["app_role"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"invited_by"?: string | null,"is_active"?: boolean,"joined_at"?: string,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_settings": {
                  Row: {
                    "allow_operator_price_override": boolean,"base_management_fee": number,"business_hours": NonNullable<Json>,"cancellation_after_purchase_rule": string,"company_id": string,"gps_sharing_mode": string,"maintenance_interval_km": number,"otp_delivery_required": boolean,"route_deviation_threshold_m": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_operator_price_override"?: boolean,"base_management_fee"?: number,"business_hours"?: NonNullable<Json>,"cancellation_after_purchase_rule"?: string,"company_id": string,"gps_sharing_mode"?: string,"maintenance_interval_km"?: number,"otp_delivery_required"?: boolean,"route_deviation_threshold_m"?: number,"updated_at"?: string
                  }
                  Update: {
                    "allow_operator_price_override"?: boolean,"base_management_fee"?: number,"business_hours"?: NonNullable<Json>,"cancellation_after_purchase_rule"?: string,"company_id"?: string,"gps_sharing_mode"?: string,"maintenance_interval_km"?: number,"otp_delivery_required"?: boolean,"route_deviation_threshold_m"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_settings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "assignee_id": string | null,"company_id": string,"created_at": string,"customer_id": string,"id": string,"last_message_at": string | null,"status": string,"updated_at": string,"whatsapp_conversation_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"company_id": string,"created_at"?: string,"customer_id": string,"id"?: string,"last_message_at"?: string | null,"status"?: string,"updated_at"?: string,"whatsapp_conversation_id"?: string | null
                  }
                  Update: {
                    "assignee_id"?: string | null,"company_id"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string,"last_message_at"?: string | null,"status"?: string,"updated_at"?: string,"whatsapp_conversation_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_addresses": {
                  Row: {
                    "address_line": string,"company_id": string,"created_at": string,"customer_id": string,"id": string,"is_default": boolean,"label": string | null,"latitude": number | null,"longitude": number | null,"reference": string | null,"updated_at": string,"zone_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line": string,"company_id": string,"created_at"?: string,"customer_id": string,"id"?: string,"is_default"?: boolean,"label"?: string | null,"latitude"?: number | null,"longitude"?: number | null,"reference"?: string | null,"updated_at"?: string,"zone_id"?: string | null
                  }
                  Update: {
                    "address_line"?: string,"company_id"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string,"is_default"?: boolean,"label"?: string | null,"latitude"?: number | null,"longitude"?: number | null,"reference"?: string | null,"updated_at"?: string,"zone_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_addresses_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customer_addresses_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customer_addresses_zone_id_fkey"
      columns: ["zone_id"]
isOneToOne: false
      referencedRelation: "service_zones"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "company_id": string,"created_at": string,"full_name": string,"id": string,"notes": string | null,"phone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"full_name": string,"id"?: string,"notes"?: string | null,"phone": string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"full_name"?: string,"id"?: string,"notes"?: string | null,"phone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"delivery_proofs": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"order_id": string,"photo_path": string | null,"proof_type": string,"recipient_name": string | null,"recorded_at": string,"recorded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"order_id": string,"photo_path"?: string | null,"proof_type": string,"recipient_name"?: string | null,"recorded_at"?: string,"recorded_by"?: string | null
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"order_id"?: string,"photo_path"?: string | null,"proof_type"?: string,"recipient_name"?: string | null,"recorded_at"?: string,"recorded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "delivery_proofs_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "delivery_proofs_order_id_fkey"
      columns: ["order_id"]
isOneToOne: true
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"driver_profiles": {
                  Row: {
                    "company_id": string,"created_at": string,"emergency_contact": string | null,"id": string,"invite_status": string,"is_available": boolean,"license_number": string | null,"member_id": string,"rating": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"emergency_contact"?: string | null,"id"?: string,"invite_status"?: string,"is_available"?: boolean,"license_number"?: string | null,"member_id": string,"rating"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"emergency_contact"?: string | null,"id"?: string,"invite_status"?: string,"is_available"?: boolean,"license_number"?: string | null,"member_id"?: string,"rating"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "driver_profiles_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "driver_profiles_member_id_fkey"
      columns: ["member_id"]
isOneToOne: true
      referencedRelation: "company_members"
      referencedColumns: ["id"]
    }
                  ]
                },"driver_shifts": {
                  Row: {
                    "closing_cash": number | null,"company_id": string,"created_at": string,"driver_id": string,"end_odometer_km": number | null,"ended_at": string | null,"fuel_level_end": number | null,"fuel_level_start": number | null,"id": string,"notes": string | null,"opening_cash": number,"start_odometer_km": number,"started_at": string,"status": Database["public"]['Enums']["shift_status"],"updated_at": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closing_cash"?: number | null,"company_id": string,"created_at"?: string,"driver_id": string,"end_odometer_km"?: number | null,"ended_at"?: string | null,"fuel_level_end"?: number | null,"fuel_level_start"?: number | null,"id"?: string,"notes"?: string | null,"opening_cash"?: number,"start_odometer_km": number,"started_at"?: string,"status"?: Database["public"]['Enums']["shift_status"],"updated_at"?: string,"vehicle_id": string
                  }
                  Update: {
                    "closing_cash"?: number | null,"company_id"?: string,"created_at"?: string,"driver_id"?: string,"end_odometer_km"?: number | null,"ended_at"?: string | null,"fuel_level_end"?: number | null,"fuel_level_start"?: number | null,"id"?: string,"notes"?: string | null,"opening_cash"?: number,"start_odometer_km"?: number,"started_at"?: string,"status"?: Database["public"]['Enums']["shift_status"],"updated_at"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "driver_shifts_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "driver_shifts_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "driver_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "driver_shifts_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"fuel_logs": {
                  Row: {
                    "amount": number,"company_id": string,"created_at": string,"driver_id": string,"fuel_level_after": number | null,"fuel_level_before": number | null,"id": string,"liters": number,"odometer_km": number,"receipt_path": string | null,"recorded_at": string,"shift_id": string | null,"station_name": string | null,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"company_id": string,"created_at"?: string,"driver_id": string,"fuel_level_after"?: number | null,"fuel_level_before"?: number | null,"id"?: string,"liters": number,"odometer_km": number,"receipt_path"?: string | null,"recorded_at"?: string,"shift_id"?: string | null,"station_name"?: string | null,"vehicle_id": string
                  }
                  Update: {
                    "amount"?: number,"company_id"?: string,"created_at"?: string,"driver_id"?: string,"fuel_level_after"?: number | null,"fuel_level_before"?: number | null,"id"?: string,"liters"?: number,"odometer_km"?: number,"receipt_path"?: string | null,"recorded_at"?: string,"shift_id"?: string | null,"station_name"?: string | null,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fuel_logs_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fuel_logs_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "driver_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fuel_logs_shift_id_fkey"
      columns: ["shift_id"]
isOneToOne: false
      referencedRelation: "driver_shifts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fuel_logs_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"gps_locations": {
                  Row: {
                    "accuracy_m": number | null,"captured_at": string,"company_id": string,"driver_id": string,"heading": number | null,"id": number,"latitude": number,"longitude": number,"order_id": string | null,"speed_kmh": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accuracy_m"?: number | null,"captured_at"?: string,"company_id": string,"driver_id": string,"heading"?: number | null,"id"?: never,"latitude": number,"longitude": number,"order_id"?: string | null,"speed_kmh"?: number | null
                  }
                  Update: {
                    "accuracy_m"?: number | null,"captured_at"?: string,"company_id"?: string,"driver_id"?: string,"heading"?: number | null,"id"?: never,"latitude"?: number,"longitude"?: number,"order_id"?: string | null,"speed_kmh"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gps_locations_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gps_locations_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "driver_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gps_locations_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"incident_events": {
                  Row: {
                    "actor_id": string | null,"body": string,"company_id": string,"created_at": string,"id": string,"incident_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"body": string,"company_id": string,"created_at"?: string,"id"?: string,"incident_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"body"?: string,"company_id"?: string,"created_at"?: string,"id"?: string,"incident_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "incident_events_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incident_events_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    }
                  ]
                },"incidents": {
                  Row: {
                    "assignee_id": string | null,"company_id": string,"created_at": string,"description": string | null,"driver_id": string | null,"id": string,"incident_number": string,"order_id": string | null,"priority": Database["public"]['Enums']["incident_priority"],"reported_by": string | null,"resolution": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": Database["public"]['Enums']["incident_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"company_id": string,"created_at"?: string,"description"?: string | null,"driver_id"?: string | null,"id"?: string,"incident_number": string,"order_id"?: string | null,"priority"?: Database["public"]['Enums']["incident_priority"],"reported_by"?: string | null,"resolution"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["incident_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "assignee_id"?: string | null,"company_id"?: string,"created_at"?: string,"description"?: string | null,"driver_id"?: string | null,"id"?: string,"incident_number"?: string,"order_id"?: string | null,"priority"?: Database["public"]['Enums']["incident_priority"],"reported_by"?: string | null,"resolution"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["incident_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "incidents_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "driver_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"maintenance_records": {
                  Row: {
                    "approved_by": string | null,"company_id": string,"completed_at": string | null,"cost": number,"created_at": string,"due_at_km": number | null,"due_date": string | null,"id": string,"kind": string,"notes": string | null,"odometer_km": number | null,"status": Database["public"]['Enums']["maintenance_status"],"supplier": string | null,"updated_at": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_by"?: string | null,"company_id": string,"completed_at"?: string | null,"cost"?: number,"created_at"?: string,"due_at_km"?: number | null,"due_date"?: string | null,"id"?: string,"kind": string,"notes"?: string | null,"odometer_km"?: number | null,"status"?: Database["public"]['Enums']["maintenance_status"],"supplier"?: string | null,"updated_at"?: string,"vehicle_id": string
                  }
                  Update: {
                    "approved_by"?: string | null,"company_id"?: string,"completed_at"?: string | null,"cost"?: number,"created_at"?: string,"due_at_km"?: number | null,"due_date"?: string | null,"id"?: string,"kind"?: string,"notes"?: string | null,"odometer_km"?: number | null,"status"?: Database["public"]['Enums']["maintenance_status"],"supplier"?: string | null,"updated_at"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "maintenance_records_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "maintenance_records_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"message_templates": {
                  Row: {
                    "body": string,"company_id": string,"created_at": string,"id": string,"is_active": boolean,"key": string,"meta_template_name": string | null,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"company_id": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"key": string,"meta_template_name"?: string | null,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"company_id"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"key"?: string,"meta_template_name"?: string | null,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "message_templates_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string | null,"company_id": string,"content_type": string,"conversation_id": string,"created_at": string,"delivery_status": string | null,"direction": string,"external_id": string | null,"id": string,"media_path": string | null,"sender_type": string,"sender_user_id": string | null,"sent_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"company_id": string,"content_type"?: string,"conversation_id": string,"created_at"?: string,"delivery_status"?: string | null,"direction": string,"external_id"?: string | null,"id"?: string,"media_path"?: string | null,"sender_type": string,"sender_user_id"?: string | null,"sent_at"?: string
                  }
                  Update: {
                    "body"?: string | null,"company_id"?: string,"content_type"?: string,"conversation_id"?: string,"created_at"?: string,"delivery_status"?: string | null,"direction"?: string,"external_id"?: string | null,"id"?: string,"media_path"?: string | null,"sender_type"?: string,"sender_user_id"?: string | null,"sent_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"channel": string,"company_id": string,"created_at": string,"id": string,"kind": string,"payload": NonNullable<Json>,"read_at": string | null,"sent_at": string | null,"title": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"channel": string,"company_id": string,"created_at"?: string,"id"?: string,"kind": string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"sent_at"?: string | null,"title": string,"user_id"?: string | null
                  }
                  Update: {
                    "body"?: string | null,"channel"?: string,"company_id"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"sent_at"?: string | null,"title"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"order_assignments": {
                  Row: {
                    "accepted_at": string | null,"assigned_by": string | null,"company_id": string,"created_at": string,"driver_id": string,"id": string,"order_id": string,"rejected_at": string | null,"rejection_reason": string | null,"unassigned_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"assigned_by"?: string | null,"company_id": string,"created_at"?: string,"driver_id": string,"id"?: string,"order_id": string,"rejected_at"?: string | null,"rejection_reason"?: string | null,"unassigned_at"?: string | null
                  }
                  Update: {
                    "accepted_at"?: string | null,"assigned_by"?: string | null,"company_id"?: string,"created_at"?: string,"driver_id"?: string,"id"?: string,"order_id"?: string,"rejected_at"?: string | null,"rejection_reason"?: string | null,"unassigned_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_assignments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_assignments_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "driver_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_assignments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_routes": {
                  Row: {
                    "company_id": string,"created_at": string,"destination_latitude": number,"destination_longitude": number,"distance_m": number | null,"driver_id": string | null,"duration_s": number | null,"encoded_polyline": string,"id": string,"order_id": string,"origin_latitude": number,"origin_longitude": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"destination_latitude": number,"destination_longitude": number,"distance_m"?: number | null,"driver_id"?: string | null,"duration_s"?: number | null,"encoded_polyline": string,"id"?: string,"order_id": string,"origin_latitude": number,"origin_longitude": number,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"destination_latitude"?: number,"destination_longitude"?: number,"distance_m"?: number | null,"driver_id"?: string | null,"duration_s"?: number | null,"encoded_polyline"?: string,"id"?: string,"order_id"?: string,"origin_latitude"?: number,"origin_longitude"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_routes_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_routes_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "driver_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_routes_order_id_fkey"
      columns: ["order_id"]
isOneToOne: true
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_status_events": {
                  Row: {
                    "actor_type": string,"actor_user_id": string | null,"company_id": string,"created_at": string,"from_status": Database["public"]['Enums']["order_status"] | null,"id": string,"note": string | null,"order_id": string,"to_status": Database["public"]['Enums']["order_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_type": string,"actor_user_id"?: string | null,"company_id": string,"created_at"?: string,"from_status"?: Database["public"]['Enums']["order_status"] | null,"id"?: string,"note"?: string | null,"order_id": string,"to_status": Database["public"]['Enums']["order_status"]
                  }
                  Update: {
                    "actor_type"?: string,"actor_user_id"?: string | null,"company_id"?: string,"created_at"?: string,"from_status"?: Database["public"]['Enums']["order_status"] | null,"id"?: string,"note"?: string | null,"order_id"?: string,"to_status"?: Database["public"]['Enums']["order_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_status_events_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_status_events_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "address_id": string | null,"adjustment_amount": number,"amount_received": number | null,"assigned_at": string | null,"cancellation_amount": number,"cancellation_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"change_due": number,"company_id": string,"conversation_id": string | null,"created_at": string,"created_by": string | null,"customer_id": string,"delivered_at": string | null,"delivery_address": string,"delivery_fee": number,"delivery_latitude": number | null,"delivery_longitude": number | null,"delivery_otp_expires_at": string | null,"delivery_otp_hash": string | null,"delivery_otp_verified_at": string | null,"delivery_reference": string | null,"driver_id": string | null,"id": string,"management_fee": number,"merchant_address": string | null,"merchant_name": string | null,"order_number": string,"payment_method": Database["public"]['Enums']["payment_method"],"pickup_notes": string | null,"priority": number,"product_amount": number,"purchase_completed_at": string | null,"service_type": Database["public"]['Enums']["service_type"],"status": Database["public"]['Enums']["order_status"],"total_amount": number | null,"transfer_receipt_path": string | null,"transfer_status": Database["public"]['Enums']["transfer_status"],"transfer_validated_at": string | null,"transfer_validated_by": string | null,"updated_at": string,"zone_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_id"?: string | null,"adjustment_amount"?: number,"amount_received"?: number | null,"assigned_at"?: string | null,"cancellation_amount"?: number,"cancellation_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"change_due"?: number,"company_id": string,"conversation_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id": string,"delivered_at"?: string | null,"delivery_address": string,"delivery_fee"?: number,"delivery_latitude"?: number | null,"delivery_longitude"?: number | null,"delivery_otp_expires_at"?: string | null,"delivery_otp_hash"?: string | null,"delivery_otp_verified_at"?: string | null,"delivery_reference"?: string | null,"driver_id"?: string | null,"id"?: string,"management_fee"?: number,"merchant_address"?: string | null,"merchant_name"?: string | null,"order_number": string,"payment_method": Database["public"]['Enums']["payment_method"],"pickup_notes"?: string | null,"priority"?: number,"product_amount"?: number,"purchase_completed_at"?: string | null,"service_type": Database["public"]['Enums']["service_type"],"status"?: Database["public"]['Enums']["order_status"],"total_amount"?: never,"transfer_receipt_path"?: string | null,"transfer_status"?: Database["public"]['Enums']["transfer_status"],"transfer_validated_at"?: string | null,"transfer_validated_by"?: string | null,"updated_at"?: string,"zone_id"?: string | null
                  }
                  Update: {
                    "address_id"?: string | null,"adjustment_amount"?: number,"amount_received"?: number | null,"assigned_at"?: string | null,"cancellation_amount"?: number,"cancellation_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"change_due"?: number,"company_id"?: string,"conversation_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string,"delivered_at"?: string | null,"delivery_address"?: string,"delivery_fee"?: number,"delivery_latitude"?: number | null,"delivery_longitude"?: number | null,"delivery_otp_expires_at"?: string | null,"delivery_otp_hash"?: string | null,"delivery_otp_verified_at"?: string | null,"delivery_reference"?: string | null,"driver_id"?: string | null,"id"?: string,"management_fee"?: number,"merchant_address"?: string | null,"merchant_name"?: string | null,"order_number"?: string,"payment_method"?: Database["public"]['Enums']["payment_method"],"pickup_notes"?: string | null,"priority"?: number,"product_amount"?: number,"purchase_completed_at"?: string | null,"service_type"?: Database["public"]['Enums']["service_type"],"status"?: Database["public"]['Enums']["order_status"],"total_amount"?: never,"transfer_receipt_path"?: string | null,"transfer_status"?: Database["public"]['Enums']["transfer_status"],"transfer_validated_at"?: string | null,"transfer_validated_by"?: string | null,"updated_at"?: string,"zone_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_address_id_fkey"
      columns: ["address_id"]
isOneToOne: false
      referencedRelation: "customer_addresses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "driver_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_zone_id_fkey"
      columns: ["zone_id"]
isOneToOne: false
      referencedRelation: "service_zones"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"full_name": string,"id": string,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string,"id": string,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string,"id"?: string,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"route_alerts": {
                  Row: {
                    "company_id": string,"created_at": string,"distance_m": number | null,"driver_id": string,"id": string,"kind": string,"order_id": string,"resolved_at": string | null,"resolved_by": string | null,"status": string,"threshold_m": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"distance_m"?: number | null,"driver_id": string,"id"?: string,"kind": string,"order_id": string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"threshold_m"?: number | null
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"distance_m"?: number | null,"driver_id"?: string,"id"?: string,"kind"?: string,"order_id"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"threshold_m"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "route_alerts_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "route_alerts_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "driver_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "route_alerts_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"service_zones": {
                  Row: {
                    "company_id": string,"created_at": string,"delivery_fee": number,"description": string | null,"id": string,"is_active": boolean,"minimum_fee": number,"name": string,"polygon_geojson": Json | null,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"delivery_fee": number,"description"?: string | null,"id"?: string,"is_active"?: boolean,"minimum_fee"?: number,"name": string,"polygon_geojson"?: Json | null,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"delivery_fee"?: number,"description"?: string | null,"id"?: string,"is_active"?: boolean,"minimum_fee"?: number,"name"?: string,"polygon_geojson"?: Json | null,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_zones_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicles": {
                  Row: {
                    "code": string,"color": string | null,"company_id": string,"created_at": string,"current_odometer_km": number,"documents": NonNullable<Json>,"fuel_level_percent": number | null,"fuel_type": string,"id": string,"make": string,"model": string,"model_year": number | null,"next_maintenance_km": number | null,"plate": string,"status": Database["public"]['Enums']["vehicle_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"color"?: string | null,"company_id": string,"created_at"?: string,"current_odometer_km"?: number,"documents"?: NonNullable<Json>,"fuel_level_percent"?: number | null,"fuel_type"?: string,"id"?: string,"make": string,"model": string,"model_year"?: number | null,"next_maintenance_km"?: number | null,"plate": string,"status"?: Database["public"]['Enums']["vehicle_status"],"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"color"?: string | null,"company_id"?: string,"created_at"?: string,"current_odometer_km"?: number,"documents"?: NonNullable<Json>,"fuel_level_percent"?: number | null,"fuel_type"?: string,"id"?: string,"make"?: string,"model"?: string,"model_year"?: number | null,"next_maintenance_km"?: number | null,"plate"?: string,"status"?: Database["public"]['Enums']["vehicle_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicles_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"whatsapp_accounts": {
                  Row: {
                    "business_account_id": string | null,"company_id": string,"connection_status": string,"created_at": string,"encrypted_access_token": string | null,"encrypted_registration_pin": string | null,"id": string,"last_synced_at": string | null,"phone_number": string | null,"phone_number_id": string | null,"provider": string,"updated_at": string,"welcome_message": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_account_id"?: string | null,"company_id": string,"connection_status"?: string,"created_at"?: string,"encrypted_access_token"?: string | null,"encrypted_registration_pin"?: string | null,"id"?: string,"last_synced_at"?: string | null,"phone_number"?: string | null,"phone_number_id"?: string | null,"provider"?: string,"updated_at"?: string,"welcome_message"?: string
                  }
                  Update: {
                    "business_account_id"?: string | null,"company_id"?: string,"connection_status"?: string,"created_at"?: string,"encrypted_access_token"?: string | null,"encrypted_registration_pin"?: string | null,"id"?: string,"last_synced_at"?: string | null,"phone_number"?: string | null,"phone_number_id"?: string | null,"provider"?: string,"updated_at"?: string,"welcome_message"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_accounts_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_company_onboarding":
{ Args: { "p_city"?: string,"p_currency_code"?: string,"p_display_name": string,"p_management_fee"?: number,"p_phone"?: string }; Returns: string
                           },
"has_company_role":
{ Args: { "allowed_roles": (Database["public"]['Enums']["app_role"])[],"target_company_id": string }; Returns: boolean
                           },
"is_company_member":
{ Args: { "target_company_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "app_role": "owner"|"admin"|"supervisor"|"operator"|"driver","incident_priority": "low"|"normal"|"medium"|"high"|"critical","incident_status": "open"|"in_review"|"resolved","maintenance_status": "planned"|"in_progress"|"completed"|"cancelled","order_status": "new"|"awaiting_confirmation"|"confirmed"|"pending_assignment"|"assigned"|"to_merchant"|"picking_up"|"to_customer"|"delivered"|"cancelled","payment_method": "cash"|"bank_transfer","service_type": "delivery"|"errand"|"package","shift_status": "open"|"closed"|"blocked","transfer_status": "not_required"|"pending_validation"|"validated"|"rejected","vehicle_status": "active"|"in_maintenance"|"damaged"|"inactive"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["owner", "admin", "supervisor", "operator", "driver"],"incident_priority": ["low", "normal", "medium", "high", "critical"],"incident_status": ["open", "in_review", "resolved"],"maintenance_status": ["planned", "in_progress", "completed", "cancelled"],"order_status": ["new", "awaiting_confirmation", "confirmed", "pending_assignment", "assigned", "to_merchant", "picking_up", "to_customer", "delivered", "cancelled"],"payment_method": ["cash", "bank_transfer"],"service_type": ["delivery", "errand", "package"],"shift_status": ["open", "closed", "blocked"],"transfer_status": ["not_required", "pending_validation", "validated", "rejected"],"vehicle_status": ["active", "in_maintenance", "damaged", "inactive"]
          }
        }
} as const
