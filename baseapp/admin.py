from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    Attribute, 
    QuestionPair, 
    Assessment, 
    AssessmentResponse, 
    QuestionResponse, 
    CustomUser
)

@admin.register(Attribute)
class AttributeAdmin(admin.ModelAdmin):
    list_display = ('name', 'active', 'created_at')
    search_fields = ('name',)
    list_filter = ('active',)

@admin.register(QuestionPair)
class QuestionPairAdmin(admin.ModelAdmin):
    list_display = ('attribute1', 'attribute2', 'active', 'created_at')
    list_filter = ('active', 'attribute1', 'attribute2')
    search_fields = ('statement_a', 'statement_b')

@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = (
        'candidate_name', 
        'position', 
        'created_by', 
        'created_at', 
        'completed', 
        'completed_at'
    )
    list_filter = ('completed', 'created_at')
    search_fields = ('candidate_name', 'candidate_email', 'position')

@admin.register(AssessmentResponse)
class AssessmentResponseAdmin(admin.ModelAdmin):
    list_display = (
        'get_candidate_name', 
        'get_assessment_position', 
        'submitted_at'
    )
    list_filter = ('submitted_at',)
    
    def get_candidate_name(self, obj):
        return obj.assessment.candidate_name
    get_candidate_name.short_description = 'Candidate Name'
    get_candidate_name.admin_order_field = 'assessment__candidate_name'
    
    def get_assessment_position(self, obj):
        return obj.assessment.position
    get_assessment_position.short_description = 'Position'
    get_assessment_position.admin_order_field = 'assessment__position'

@admin.register(QuestionResponse)
class QuestionResponseAdmin(admin.ModelAdmin):
    list_display = (
        'get_candidate_name', 
        'get_assessment_position', 
        'question_pair', 
        'chose_a', 
        'response_time'
    )
    list_filter = ('chose_a', 'response_time', 'question_pair__attribute1', 'question_pair__attribute2')
    
    def get_candidate_name(self, obj):
        return obj.assessment_response.assessment.candidate_name
    get_candidate_name.short_description = 'Candidate Name'
    get_candidate_name.admin_order_field = 'assessment_response__assessment__candidate_name'
    
    def get_assessment_position(self, obj):
        return obj.assessment_response.assessment.position
    get_assessment_position.short_description = 'Position'
    get_assessment_position.admin_order_field = 'assessment_response__assessment__position'

class CustomUserAdmin(UserAdmin):
    # Add 'is_hr' to the list of fields displayed in the list view
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_hr', 'is_staff')
    
    # Add 'is_hr' to the fieldsets
    fieldsets = UserAdmin.fieldsets + (
        ('HR Status', {'fields': ('is_hr',)}),
    )
    
    # Add 'is_hr' to the fields shown when creating a new user
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('HR Status', {'fields': ('is_hr',)}),
    )

# Register the CustomUser model with the custom admin class
admin.site.register(CustomUser, CustomUserAdmin)