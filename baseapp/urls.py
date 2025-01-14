from django.urls import path
from . import views

app_name = 'baseapp'

# Group URLs by function for better organization
urlpatterns = [
    #util urls

    #base views
    path('', views.home, name='home'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
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

    #--hr
    path('api/hr-users/<int:pk>/', views.hr_user_detail, name='hr-user-detail'),
    path('api/hr-users/', views.hr_user_list_create, name='hr-user-list-create'),
    path('api/businesses/<int:business_id>/hr-users/', views.business_hr_users, name='business-hr-users'),

    #--assessment info
    path('api/businesses/<int:business_id>/upload-template/', views.upload_assessment_template, name='upload-assessment-template'),
    path('api/question-pairs/', views.question_pair_list, name='question-pair-list'),
    path('api/attributes/', views.attribute_list, name='attribute-list'),
    

    #--benchmark
    path('api/businesses/<int:business_id>/benchmark-emails/', views.benchmark_emails, name='benchmark-emails'),
    path('api/businesses/<int:business_id>/add-benchmark-emails/',views.add_benchmark_emails,name='add-benchmark-emails'),
    path('api/businesses/<int:business_id>/send-benchmark-email/',views.send_benchmark_email,name='send-benchmark-email'),
    path('api/businesses/<int:business_id>/benchmark-results/',views.benchmark_results,name='benchmark-results'),

    #--admin assessment
    path('api/businesses/<int:business_id>/assessments/', views.business_assessments, name='business-assessments'),
    path('api/businesses/<int:business_id>/create-assessment/', views.admin_create_assessment, name='admin-create-assessment'),

    #hr
    path('dashboard/', views.dashboard, name='dashboard'),
    path('create/', views.create_assessment, name='create_assessment'),
    path('assessment/<int:assessment_id>/resend/', views.resend_assessment, name='resend_assessment'),
    path('assessment/preview/<int:assessment_id>/', views.preview_assessment_report, name='preview_assessment_report'),
    path('assessment/download/<int:assessment_id>/', views.download_assessment_report, name='download_assessment_report'),


    
    

    
    
    

    
]