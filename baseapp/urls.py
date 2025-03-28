from django.urls import path
from . import views

app_name = 'baseapp'

# Group URLs by function for better organization
urlpatterns = [
    #util urls
    path('api/benchmark/refresh/<int:business_id>/', views.refresh_benchmark_cache, name='refresh_benchmark_cache'),

    #base views
    path('', views.home, name='home'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('password-reset/', views.password_reset_view, name='password_reset'),
    path('password-reset/<str:token>/', views.password_reset_confirm, name='password_reset_confirm'),
    path('assessment/<str:unique_link>/', views.take_assessment, name='take_assessment'),
    path('thank-you/', views.thank_you, name='thank_you'),

    #admin
    #--overall
    path('manage/dashboard/', views.admin_dashboard, name='admin_dashboard'),

    #--business
    path('api/businesses/', views.business_list_create, name='business-list-create'),
    path('api/businesses/list/', views.list_businesses, name='list-businesses'),
    path('api/businesses/<int:business_id>/details/', views.business_details, name='business-details'),
    path('api/businesses/<int:pk>/', views.business_detail, name='business-detail'),
    path('api/businesses/<int:business_id>/upload-logo/', views.upload_business_logo, name='upload-business-logo'),

    #--hr
    path('api/hr-users/<int:pk>/', views.hr_user_detail, name='hr-user-detail'),
    path('api/hr-users/', views.hr_user_list_create, name='hr-user-list-create'),
    path('api/hr-users/<int:pk>/reset-password/', views.hr_user_reset_password, name='hr-user-reset-password'),
    path('api/businesses/<int:business_id>/hr-users/', views.business_hr_users, name='business-hr-users'),

    #--assessment info
    path('api/businesses/<int:business_id>/upload-template/', views.upload_assessment_template, name='upload-assessment-template'),
    path('api/question-pairs/', views.question_pair_list, name='question-pair-list'),
    path('api/question-pairs/<int:pk>/', views.question_pair_detail, name='question-pair-detail'),
    path('api/attributes/', views.attribute_list, name='attribute-list'),
    

    #--benchmark
    path('api/businesses/<int:business_id>/benchmark-emails/', views.benchmark_emails, name='benchmark-emails'),
    path('api/businesses/<int:business_id>/add-benchmark-emails/',views.add_benchmark_emails,name='add-benchmark-emails'),
    path('api/businesses/<int:business_id>/benchmark-email-template/', views.benchmark_email_template, name='benchmark-email-template'),
    path('api/businesses/<int:business_id>/delete-benchmark-email/', views.delete_benchmark_email, name='delete-benchmark-email'),
    path('api/businesses/<int:business_id>/update-benchmark-email/', views.update_benchmark_email, name='update-benchmark-email'),
    path('api/businesses/<int:business_id>/send-benchmark-email/',views.send_benchmark_email,name='send-benchmark-email'),
    path('api/businesses/<int:business_id>/benchmark-results/',views.benchmark_results,name='benchmark-results'),

    #--admin assessment
    path('api/businesses/<int:business_id>/assessments/', views.business_assessments, name='business-assessments'),
    path('api/businesses/<int:business_id>/create-assessment/', views.admin_create_assessment, name='admin-create-assessment'),
    path('api/admin/assessments/<int:assessment_id>/preview/', views.admin_preview_assessment, name='admin-preview-assessment'),
    path('api/admin/assessments/<int:assessment_id>/download/', views.admin_download_assessment, name='admin-download-assessment'),
    path('api/admin/assessments/<int:assessment_id>/resend/', views.admin_resend_assessment, name='admin-resend-assessment'),
    path('api/assessments/<int:assessment_id>/', views.handle_assessment, name='handle-assessment'),
    path('api/assessments/<int:assessment_id>/managers/', views.assessment_managers, name='assessment-managers'),

    #--admin training material
    path('api/training-materials/', views.training_materials, name='training-materials'),
    path('api/training-materials/<int:material_id>/', views.training_material_detail, name='training-material-detail'),


    #--admin manager
    path('api/businesses/<int:business_id>/managers/', views.manage_managers, name='manage_managers'),
    path('api/managers/<int:manager_id>/', views.manage_manager, name='manage_manager'),

    #hr
    path('dashboard/', views.dashboard, name='dashboard'),
    path('create/', views.create_assessment, name='create_assessment'),
    path('assessment/<int:assessment_id>/resend/', views.resend_assessment, name='resend_assessment'),
    path('assessment/preview/<int:assessment_id>/', views.preview_assessment_report, name='preview_assessment_report'),
    path('assessment/download/<int:assessment_id>/', views.download_assessment_report, name='download_assessment_report'),
    path('training/', views.training, name='training'),

]