export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcement_targets: {
        Row: {
          announcement_id: string
          class_id: string | null
          created_at: string
          id: string
        }
        Insert: {
          announcement_id: string
          class_id?: string | null
          created_at?: string
          id?: string
        }
        Update: {
          announcement_id?: string
          class_id?: string | null
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_targets_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_targets_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          announcement_type: string
          content: string
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          is_active: boolean | null
          priority: string | null
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          announcement_type?: string
          content: string
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          announcement_type?: string
          content?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      admissions_settings: {
        Row: {
          academic_year: string
          application_fee: number
          contact_email: string | null
          id: string
          instructions: string | null
          is_open: boolean
          required_documents: string[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year?: string
          application_fee?: number
          contact_email?: string | null
          id?: string
          instructions?: string | null
          is_open?: boolean
          required_documents?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          application_fee?: number
          contact_email?: string | null
          id?: string
          instructions?: string | null
          is_open?: boolean
          required_documents?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      admission_applications: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          application_number: string
          city: string | null
          converted_student_id: string | null
          created_at: string
          desired_academic_year: string | null
          desired_class_id: string | null
          documents: Json | null
          id: string
          interview_at: string | null
          interview_notes: string | null
          notes: string | null
          parent_email: string
          parent_name: string
          parent_occupation: string | null
          parent_phone: string
          parent_relationship: string
          postal_code: string | null
          previous_board: string | null
          previous_class: string | null
          previous_percentage: number | null
          previous_school: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          secondary_parent_name: string | null
          secondary_parent_phone: string | null
          state: string | null
          status: string
          student_blood_group: string | null
          student_date_of_birth: string
          student_first_name: string
          student_gender: string | null
          student_last_name: string
          student_nationality: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          application_number?: string
          city?: string | null
          converted_student_id?: string | null
          created_at?: string
          desired_academic_year?: string | null
          desired_class_id?: string | null
          documents?: Json | null
          id?: string
          interview_at?: string | null
          interview_notes?: string | null
          notes?: string | null
          parent_email: string
          parent_name: string
          parent_occupation?: string | null
          parent_phone: string
          parent_relationship?: string
          postal_code?: string | null
          previous_board?: string | null
          previous_class?: string | null
          previous_percentage?: number | null
          previous_school?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_parent_name?: string | null
          secondary_parent_phone?: string | null
          state?: string | null
          status?: string
          student_blood_group?: string | null
          student_date_of_birth: string
          student_first_name: string
          student_gender?: string | null
          student_last_name: string
          student_nationality?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          application_number?: string
          city?: string | null
          converted_student_id?: string | null
          created_at?: string
          desired_academic_year?: string | null
          desired_class_id?: string | null
          documents?: Json | null
          id?: string
          interview_at?: string | null
          interview_notes?: string | null
          notes?: string | null
          parent_email?: string
          parent_name?: string
          parent_occupation?: string | null
          parent_phone?: string
          parent_relationship?: string
          postal_code?: string | null
          previous_board?: string | null
          previous_class?: string | null
          previous_percentage?: number | null
          previous_school?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_parent_name?: string | null
          secondary_parent_phone?: string | null
          state?: string | null
          status?: string
          student_blood_group?: string | null
          student_date_of_birth?: string
          student_first_name?: string
          student_gender?: string | null
          student_last_name?: string
          student_nationality?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_applications_desired_class_id_fkey"
            columns: ["desired_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_applications_converted_student_id_fkey"
            columns: ["converted_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_justifications: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          reason: string
          request_type: string
          requested_by: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          reason: string
          request_type?: string
          requested_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          reason?: string
          request_type?: string
          requested_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_justifications_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_justifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_settings: {
        Row: {
          enforce_exam_eligibility: boolean
          exclude_weekends: boolean
          id: string
          late_counts_as_present: boolean
          min_attendance_percent: number
          notify_parents_on_absence: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enforce_exam_eligibility?: boolean
          exclude_weekends?: boolean
          id?: string
          late_counts_as_present?: boolean
          min_attendance_percent?: number
          notify_parents_on_absence?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enforce_exam_eligibility?: boolean
          exclude_weekends?: boolean
          id?: string
          late_counts_as_present?: boolean
          min_attendance_percent?: number
          notify_parents_on_absence?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      school_holidays: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          marked_by: string | null
          remarks: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          marked_by?: string | null
          remarks?: string | null
          status: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          remarks?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      book_issues: {
        Row: {
          book_id: string
          created_at: string
          due_date: string
          fine_amount: number | null
          fine_paid: boolean | null
          id: string
          issue_date: string
          issued_by: string | null
          remarks: string | null
          return_date: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          due_date: string
          fine_amount?: number | null
          fine_paid?: boolean | null
          id?: string
          issue_date?: string
          issued_by?: string | null
          remarks?: string | null
          return_date?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          due_date?: string
          fine_amount?: number | null
          fine_paid?: boolean | null
          id?: string
          issue_date?: string
          issued_by?: string | null
          remarks?: string | null
          return_date?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_issues_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_issues_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      book_reservations: {
        Row: {
          book_id: string
          created_at: string
          expiry_date: string
          id: string
          reservation_date: string
          status: string
          student_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          expiry_date?: string
          id?: string
          reservation_date?: string
          status?: string
          student_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          expiry_date?: string
          id?: string
          reservation_date?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reservations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_reservations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          available_copies: number
          category: string
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          isbn: string | null
          location: string | null
          publication_year: number | null
          publisher: string | null
          title: string
          total_copies: number
          updated_at: string
        }
        Insert: {
          author: string
          available_copies?: number
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          isbn?: string | null
          location?: string | null
          publication_year?: number | null
          publisher?: string | null
          title: string
          total_copies?: number
          updated_at?: string
        }
        Update: {
          author?: string
          available_copies?: number
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          isbn?: string | null
          location?: string | null
          publication_year?: number | null
          publisher?: string | null
          title?: string
          total_copies?: number
          updated_at?: string
        }
        Relationships: []
      }
      bus_routes: {
        Row: {
          created_at: string
          distance_km: number | null
          end_location: string
          evening_time: string | null
          id: string
          is_active: boolean | null
          monthly_fee: number
          morning_time: string | null
          route_name: string
          route_number: string | null
          start_location: string
          stops: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          end_location: string
          evening_time?: string | null
          id?: string
          is_active?: boolean | null
          monthly_fee?: number
          morning_time?: string | null
          route_name: string
          route_number?: string | null
          start_location: string
          stops?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          end_location?: string
          evening_time?: string | null
          id?: string
          is_active?: boolean | null
          monthly_fee?: number
          morning_time?: string | null
          route_name?: string
          route_number?: string | null
          start_location?: string
          stops?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      buses: {
        Row: {
          bus_number: string
          capacity: number
          conductor_id: string | null
          conductor_name: string | null
          conductor_phone: string | null
          created_at: string
          driver_id: string | null
          driver_name: string | null
          driver_phone: string | null
          driver_user_id: string | null
          id: string
          is_active: boolean | null
          route_id: string | null
          updated_at: string
        }
        Insert: {
          bus_number: string
          capacity?: number
          conductor_id?: string | null
          conductor_name?: string | null
          conductor_phone?: string | null
          created_at?: string
          driver_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_user_id?: string | null
          id?: string
          is_active?: boolean | null
          route_id?: string | null
          updated_at?: string
        }
        Update: {
          bus_number?: string
          capacity?: number
          conductor_id?: string | null
          conductor_name?: string | null
          conductor_phone?: string | null
          created_at?: string
          driver_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_user_id?: string | null
          id?: string
          is_active?: boolean | null
          route_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buses_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buses_conductor_id_fkey"
            columns: ["conductor_id"]
            isOneToOne: false
            referencedRelation: "conductors"
            referencedColumns: ["id"]
          },
        ]
      }
      conductors: {
        Row: {
          created_at: string
          date_of_joining: string | null
          emergency_contact: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date_of_joining?: string | null
          emergency_contact?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date_of_joining?: string | null
          emergency_contact?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          date_of_joining: string | null
          emergency_contact: string | null
          experience_years: number | null
          id: string
          is_active: boolean
          license_expiry: string | null
          license_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_joining?: string | null
          emergency_contact?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean
          license_expiry?: string | null
          license_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_joining?: string | null
          emergency_contact?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean
          license_expiry?: string | null
          license_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bus_locations: {
        Row: {
          accuracy_m: number | null
          heading: number | null
          id: string
          lat: number
          lng: number
          recorded_at: string
          speed_kmh: number | null
          trip_id: string
        }
        Insert: {
          accuracy_m?: number | null
          heading?: number | null
          id?: string
          lat: number
          lng: number
          recorded_at?: string
          speed_kmh?: number | null
          trip_id: string
        }
        Update: {
          accuracy_m?: number | null
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string
          speed_kmh?: number | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_locations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "bus_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_trips: {
        Row: {
          bus_id: string
          created_at: string
          ended_at: string | null
          id: string
          route_id: string
          started_at: string
          started_by: string | null
          status: "active" | "completed" | "cancelled"
          trip_type: "morning" | "evening"
        }
        Insert: {
          bus_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          route_id: string
          started_at?: string
          started_by?: string | null
          status?: "active" | "completed" | "cancelled"
          trip_type: "morning" | "evening"
        }
        Update: {
          bus_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          route_id?: string
          started_at?: string
          started_by?: string | null
          status?: "active" | "completed" | "cancelled"
          trip_type?: "morning" | "evening"
        }
        Relationships: [
          {
            foreignKeyName: "bus_trips_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          route_id: string
          scheduled_evening_time: string | null
          scheduled_morning_time: string | null
          sequence: number
        }
        Insert: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          route_id: string
          scheduled_evening_time?: string | null
          scheduled_morning_time?: string | null
          sequence: number
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          route_id?: string
          scheduled_evening_time?: string | null
          scheduled_morning_time?: string | null
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_stop_events: {
        Row: {
          event_type: "arrived" | "departed" | "skipped"
          id: string
          recorded_at: string
          route_stop_id: string
          trip_id: string
        }
        Insert: {
          event_type?: "arrived" | "departed" | "skipped"
          id?: string
          recorded_at?: string
          route_stop_id: string
          trip_id: string
        }
        Update: {
          event_type?: "arrived" | "departed" | "skipped"
          id?: string
          recorded_at?: string
          route_stop_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_stop_events_route_stop_id_fkey"
            columns: ["route_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_stop_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "bus_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          class_id: string
          created_at: string
          description: string | null
          id: string
          learning_objectives: string | null
          prerequisites: string | null
          resources: string | null
          session_date: string
          status: string | null
          subject_id: string
          teacher_id: string
          timetable_slot_id: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          description?: string | null
          id?: string
          learning_objectives?: string | null
          prerequisites?: string | null
          resources?: string | null
          session_date: string
          status?: string | null
          subject_id: string
          teacher_id: string
          timetable_slot_id?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          description?: string | null
          id?: string
          learning_objectives?: string | null
          prerequisites?: string | null
          resources?: string | null
          session_date?: string
          status?: string | null
          subject_id?: string
          teacher_id?: string
          timetable_slot_id?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_timetable_slot_id_fkey"
            columns: ["timetable_slot_id"]
            isOneToOne: false
            referencedRelation: "timetable_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string
          created_at: string
          id: string
          name: string
          section: string
        }
        Insert: {
          academic_year?: string
          created_at?: string
          id?: string
          name: string
          section: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          id?: string
          name?: string
          section?: string
        }
        Relationships: []
      }
      exam_types: {
        Row: {
          academic_year: string
          created_at: string
          description: string | null
          id: string
          name: string
          weightage: number | null
        }
        Insert: {
          academic_year?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          weightage?: number | null
        }
        Update: {
          academic_year?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          weightage?: number | null
        }
        Relationships: []
      }
      exams: {
        Row: {
          class_id: string
          created_at: string
          end_time: string
          exam_date: string
          exam_type_id: string
          id: string
          max_marks: number
          notes: string | null
          room: string | null
          start_time: string
          status: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          end_time: string
          exam_date: string
          exam_type_id: string
          id?: string
          max_marks?: number
          notes?: string | null
          room?: string | null
          start_time: string
          status?: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          end_time?: string
          exam_date?: string
          exam_type_id?: string
          id?: string
          max_marks?: number
          notes?: string | null
          room?: string | null
          start_time?: string
          status?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_exam_type_id_fkey"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "exam_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_recurring: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          name?: string
        }
        Relationships: []
      }
      fee_invoice_items: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_invoice_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fee_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_invoices: {
        Row: {
          academic_year: string
          created_at: string
          due_date: string
          id: string
          invoice_number: string
          month: number | null
          notes: string | null
          paid_amount: number | null
          quarter: number | null
          status: string
          student_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          academic_year?: string
          created_at?: string
          due_date: string
          id?: string
          invoice_number: string
          month?: number | null
          notes?: string | null
          paid_amount?: number | null
          quarter?: number | null
          status?: string
          student_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string
          month?: number | null
          notes?: string | null
          paid_amount?: number | null
          quarter?: number | null
          status?: string
          student_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount: number
          created_at: string
          gateway_status: string | null
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          received_by: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_status?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          received_by?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_status?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          received_by?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fee_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year: string
          amount: number
          category_id: string
          class_id: string
          created_at: string
          due_day: number | null
          frequency: string
          id: string
          late_fee_amount: number | null
          updated_at: string
        }
        Insert: {
          academic_year?: string
          amount: number
          category_id: string
          class_id: string
          created_at?: string
          due_day?: number | null
          frequency?: string
          id?: string
          late_fee_amount?: number | null
          updated_at?: string
        }
        Update: {
          academic_year?: string
          amount?: number
          category_id?: string
          class_id?: string
          created_at?: string
          due_day?: number | null
          frequency?: string
          id?: string
          late_fee_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          assigned_by: string
          assigned_date: string
          attachment_url: string | null
          class_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          subject_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_date?: string
          attachment_url?: string | null
          class_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          subject_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_date?: string
          attachment_url?: string | null
          class_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          subject_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          attachment_url: string | null
          created_at: string
          feedback: string | null
          grade: string | null
          homework_id: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          submission_text: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          feedback?: string | null
          grade?: string | null
          homework_id: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
          submission_text?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          feedback?: string | null
          grade?: string | null
          homework_id?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
          submission_text?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          end_date: string
          id: string
          leave_type: string
          reason: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          leave_type: string
          reason: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      marks: {
        Row: {
          class_id: string
          created_at: string
          entered_by: string | null
          exam_type_id: string
          grade: string | null
          id: string
          marks_obtained: number
          max_marks: number
          remarks: string | null
          student_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          entered_by?: string | null
          exam_type_id: string
          grade?: string | null
          id?: string
          marks_obtained: number
          max_marks?: number
          remarks?: string | null
          student_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          entered_by?: string | null
          exam_type_id?: string
          grade?: string | null
          id?: string
          marks_obtained?: number
          max_marks?: number
          remarks?: string | null
          student_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_exam_type_id_fkey"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "exam_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      parent_student: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          relationship: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          relationship?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          relationship?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          created_at: string
          id: string
          occupation: string | null
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          occupation?: string | null
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          occupation?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parents_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name: string
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          academic_year: string
          class_id: string | null
          created_at: string
          description: string | null
          external_url: string | null
          file_url: string | null
          id: string
          is_active: boolean
          resource_type: string
          subject_id: string | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          academic_year?: string
          class_id?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          resource_type?: string
          subject_id?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          academic_year?: string
          class_id?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          resource_type?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      school_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      student_transport: {
        Row: {
          academic_year: string
          bus_id: string
          created_at: string
          drop_point: string | null
          id: string
          is_active: boolean | null
          pickup_point: string
          route_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: string
          bus_id: string
          created_at?: string
          drop_point?: string | null
          id?: string
          is_active?: boolean | null
          pickup_point: string
          route_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          bus_id?: string
          created_at?: string
          drop_point?: string | null
          id?: string
          is_active?: boolean | null
          pickup_point?: string
          route_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_transport_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transport_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transport_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_date: string | null
          admission_number: string | null
          blood_group: string | null
          class_id: string | null
          created_at: string
          emergency_contact: string | null
          id: string
          roll_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admission_date?: string | null
          admission_number?: string | null
          blood_group?: string | null
          class_id?: string | null
          created_at?: string
          emergency_contact?: string | null
          id?: string
          roll_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admission_date?: string | null
          admission_number?: string | null
          blood_group?: string | null
          class_id?: string | null
          created_at?: string
          emergency_contact?: string | null
          id?: string
          roll_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      teacher_classes: {
        Row: {
          class_id: string
          created_at: string
          id: string
          is_class_teacher: boolean | null
          subject_id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          is_class_teacher?: boolean | null
          subject_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          is_class_teacher?: boolean | null
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_classes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          designation: string | null
          employee_id: string | null
          id: string
          joining_date: string | null
          qualification: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          designation?: string | null
          employee_id?: string | null
          id?: string
          joining_date?: string | null
          qualification?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          designation?: string | null
          employee_id?: string | null
          id?: string
          joining_date?: string | null
          qualification?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          slot_number: number
          start_time: string
          subject_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          slot_number: number
          start_time: string
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          slot_number?: number
          start_time?: string
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "parent" | "teacher" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "parent", "teacher", "admin"],
    },
  },
} as const
