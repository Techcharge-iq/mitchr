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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      advance_repayments: {
        Row: {
          advance_id: string
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payroll_id: string | null
        }
        Insert: {
          advance_id: string
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payroll_id?: string | null
        }
        Update: {
          advance_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payroll_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advance_repayments_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "advances"
            referencedColumns: ["id"]
          },
        ]
      }
      advances: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          employee_id: string
          expense_date: string
          id: string
          monthly_deduction: number
          others: string | null
          purpose: string | null
          reason: string | null
          remaining_amount: number
          salary_adjusted_at: string | null
          start_deduction_date: string | null
          status: Database["public"]["Enums"]["advance_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          expense_date: string
          id?: string
          monthly_deduction: number
          others?: string | null
          purpose?: string | null
          reason?: string | null
          remaining_amount: number
          salary_adjusted_at?: string | null
          start_deduction_date?: string | null
          status?: Database["public"]["Enums"]["advance_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          expense_date?: string
          id?: string
          monthly_deduction?: number
          others?: string | null
          purpose?: string | null
          reason?: string | null
          remaining_amount?: number
          salary_adjusted_at?: string | null
          start_deduction_date?: string | null
          status?: Database["public"]["Enums"]["advance_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advances_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          department_id: string | null
          expire_date: string | null
          id: string
          is_pinned: boolean | null
          priority: Database["public"]["Enums"]["announcement_priority"] | null
          publish_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          expire_date?: string | null
          id?: string
          is_pinned?: boolean | null
          priority?: Database["public"]["Enums"]["announcement_priority"] | null
          publish_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          expire_date?: string | null
          id?: string
          is_pinned?: boolean | null
          priority?: Database["public"]["Enums"]["announcement_priority"] | null
          publish_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_in_latitude: number | null
          check_in_longitude: number | null
          check_out: string | null
          check_out_latitude: number | null
          check_out_longitude: number | null
          created_at: string | null
          date: string
          early_leave_minutes: number | null
          employee_id: string
          id: string
          late_minutes: number | null
          notes: string | null
          overtime_minutes: number | null
          status: Database["public"]["Enums"]["attendance_status"] | null
        }
        Insert: {
          check_in?: string | null
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_out?: string | null
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          created_at?: string | null
          date?: string
          early_leave_minutes?: number | null
          employee_id: string
          id?: string
          late_minutes?: number | null
          notes?: string | null
          overtime_minutes?: number | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
        }
        Update: {
          check_in?: string | null
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_out?: string | null
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          created_at?: string | null
          date?: string
          early_leave_minutes?: number | null
          employee_id?: string
          id?: string
          late_minutes?: number | null
          notes?: string | null
          overtime_minutes?: number | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          manager_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          employee_id: string | null
          file_name: string | null
          file_size: number | null
          file_url: string
          id: string
          is_company_document: boolean | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          is_company_document?: boolean | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          is_company_document?: boolean | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          avatar_url: string | null
          branch_id: string | null
          city: string | null
          contract_type: Database["public"]["Enums"]["contract_type"] | null
          created_at: string | null
          date_of_birth: string | null
          department_id: string | null
          designation: string | null
          email: string
          emergency_contact: string | null
          emergency_phone: string | null
          employee_code: string
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          first_name: string
          gender: string | null
          hire_date: string | null
          id: string
          is_field_staff: boolean | null
          last_name: string
          phone: string | null
          reporting_manager_id: string | null
          termination_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          branch_id?: string | null
          city?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          designation?: string | null
          email: string
          emergency_contact?: string | null
          emergency_phone?: string | null
          employee_code: string
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          first_name: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          is_field_staff?: boolean | null
          last_name: string
          phone?: string | null
          reporting_manager_id?: string | null
          termination_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          branch_id?: string | null
          city?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          designation?: string | null
          email?: string
          emergency_contact?: string | null
          emergency_phone?: string | null
          employee_code?: string
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          first_name?: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          is_field_staff?: boolean | null
          last_name?: string
          phone?: string | null
          reporting_manager_id?: string | null
          termination_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: string | null
          id: string
          is_all_day: boolean | null
          location: string | null
          start_date: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          start_date: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          start_date?: string
          title?: string
        }
        Relationships: []
      }
      gps_logs: {
        Row: {
          accuracy: number | null
          battery_level: number | null
          employee_id: string
          heading: number | null
          id: string
          is_moving: boolean | null
          latitude: number
          longitude: number
          recorded_at: string | null
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          battery_level?: number | null
          employee_id: string
          heading?: number | null
          id?: string
          is_moving?: boolean | null
          latitude: number
          longitude: number
          recorded_at?: string | null
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          battery_level?: number | null
          employee_id?: string
          heading?: number | null
          id?: string
          is_moving?: boolean | null
          latitude?: number
          longitude?: number
          recorded_at?: string | null
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gps_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string | null
          date: string
          id: string
          is_recurring: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          is_recurring?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          is_recurring?: boolean | null
          name?: string
        }
        Relationships: []
      }
      leave_applications: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          employee_id: string
          end_date: string
          id: string
          leave_type_id: string | null
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"] | null
          total_days: number
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          end_date: string
          id?: string
          leave_type_id?: string | null
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          total_days: number
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          leave_type_id?: string | null
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          total_days?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_applications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          leave_type_id: string
          remaining_days: number | null
          total_days: number | null
          used_days: number | null
          year: number
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          leave_type_id: string
          remaining_days?: number | null
          total_days?: number | null
          used_days?: number | null
          year?: number
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          leave_type_id?: string
          remaining_days?: number | null
          total_days?: number | null
          used_days?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          created_at: string | null
          default_days: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_paid: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          default_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          default_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          name?: string
        }
        Relationships: []
      }
      payroll: {
        Row: {
          absent_days: number | null
          advance_deduction: number | null
          attendance_deduction: number | null
          basic_salary: number
          created_at: string | null
          employee_id: string
          gross_salary: number
          id: string
          leave_days: number | null
          month: number
          net_salary: number
          other_deductions: number | null
          overtime_hours: number | null
          overtime_pay: number | null
          paid_at: string | null
          present_days: number | null
          status: string | null
          tax_deduction: number | null
          total_allowances: number | null
          updated_at: string | null
          working_days: number | null
          year: number
        }
        Insert: {
          absent_days?: number | null
          advance_deduction?: number | null
          attendance_deduction?: number | null
          basic_salary: number
          created_at?: string | null
          employee_id: string
          gross_salary: number
          id?: string
          leave_days?: number | null
          month: number
          net_salary: number
          other_deductions?: number | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          paid_at?: string | null
          present_days?: number | null
          status?: string | null
          tax_deduction?: number | null
          total_allowances?: number | null
          updated_at?: string | null
          working_days?: number | null
          year: number
        }
        Update: {
          absent_days?: number | null
          advance_deduction?: number | null
          attendance_deduction?: number | null
          basic_salary?: number
          created_at?: string | null
          employee_id?: string
          gross_salary?: number
          id?: string
          leave_days?: number | null
          month?: number
          net_salary?: number
          other_deductions?: number | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          paid_at?: string | null
          present_days?: number | null
          status?: string | null
          tax_deduction?: number | null
          total_allowances?: number | null
          updated_at?: string | null
          working_days?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_goals: {
        Row: {
          created_at: string | null
          current_value: number | null
          description: string | null
          employee_id: string
          end_date: string | null
          id: string
          start_date: string | null
          status: string | null
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          comments: string | null
          created_at: string | null
          employee_id: string
          goals_achieved: number | null
          goals_total: number | null
          id: string
          improvements: string | null
          rating: number | null
          review_period: string | null
          reviewer_id: string | null
          strengths: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          employee_id: string
          goals_achieved?: number | null
          goals_total?: number | null
          id?: string
          improvements?: string | null
          rating?: number | null
          review_period?: string | null
          reviewer_id?: string | null
          strengths?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          employee_id?: string
          goals_achieved?: number | null
          goals_total?: number | null
          id?: string
          improvements?: string | null
          rating?: number | null
          review_period?: string | null
          reviewer_id?: string | null
          strengths?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      salary_structures: {
        Row: {
          basic_salary: number
          created_at: string | null
          effective_from: string | null
          employee_id: string
          housing_allowance: number | null
          id: string
          is_active: boolean | null
          medical_allowance: number | null
          other_allowances: number | null
          other_deductions: number | null
          tax_deduction: number | null
          transport_allowance: number | null
          updated_at: string | null
          working_hours_per_month: number | null
        }
        Insert: {
          basic_salary?: number
          created_at?: string | null
          effective_from?: string | null
          employee_id: string
          housing_allowance?: number | null
          id?: string
          is_active?: boolean | null
          medical_allowance?: number | null
          other_allowances?: number | null
          other_deductions?: number | null
          tax_deduction?: number | null
          transport_allowance?: number | null
          updated_at?: string | null
          working_hours_per_month?: number | null
        }
        Update: {
          basic_salary?: number
          created_at?: string | null
          effective_from?: string | null
          employee_id?: string
          housing_allowance?: number | null
          id?: string
          is_active?: boolean | null
          medical_allowance?: number | null
          other_allowances?: number | null
          other_deductions?: number | null
          tax_deduction?: number | null
          transport_allowance?: number | null
          updated_at?: string | null
          working_hours_per_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_structures_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      get_employee_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_hr: { Args: { _user_id: string }; Returns: boolean }
      is_manager_or_above: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      advance_status:
        | "pending"
        | "approved"
        | "rejected"
        | "repaying"
        | "completed"
      announcement_priority: "low" | "normal" | "high" | "urgent"
      app_role: "admin" | "hr_staff" | "manager" | "accountant" | "employee"
      attendance_status:
        | "present"
        | "absent"
        | "half_day"
        | "on_leave"
        | "holiday"
      contract_type: "full_time" | "part_time" | "contract" | "intern"
      employment_status: "active" | "on_leave" | "terminated" | "suspended"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
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
      advance_status: [
        "pending",
        "approved",
        "rejected",
        "repaying",
        "completed",
      ],
      announcement_priority: ["low", "normal", "high", "urgent"],
      app_role: ["admin", "hr_staff", "manager", "accountant", "employee"],
      attendance_status: [
        "present",
        "absent",
        "half_day",
        "on_leave",
        "holiday",
      ],
      contract_type: ["full_time", "part_time", "contract", "intern"],
      employment_status: ["active", "on_leave", "terminated", "suspended"],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
    },
  },
} as const
