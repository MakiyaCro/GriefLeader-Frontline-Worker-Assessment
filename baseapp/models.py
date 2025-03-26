from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.crypto import get_random_string
from django.core.validators import FileExtensionValidator
from cloudinary.models import CloudinaryField

class Business(models.Model):
    """Represents a business/organization using the platform"""
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    logo = CloudinaryField('logo', null=True, blank=True, folder='business_logos')
    primary_color = models.CharField(max_length=7, default="#000000")  # Hex color code
    created_at = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)
    
    # New field to track if assessment template is uploaded
    assessment_template_uploaded = models.BooleanField(default=False)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "businesses"

class CustomUser(AbstractUser):
    is_hr = models.BooleanField(default=False)
    business = models.ForeignKey(
        Business, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='users'
    )
    current_business = models.ForeignKey(
        Business,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_users'
    )
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def set_current_business(self, business):
        self.current_business = business
        self.save()

class Attribute(models.Model):
    """Represents an attribute like Integrity, Safety, Work Ethic, etc."""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['order', 'name']
        unique_together = ['name', 'business']

class QuestionPair(models.Model):
    """Represents a pair of attributes being compared"""
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    attribute1 = models.ForeignKey(
        Attribute, 
        on_delete=models.CASCADE, 
        related_name='questions_as_first'
    )
    attribute2 = models.ForeignKey(
        Attribute, 
        on_delete=models.CASCADE, 
        related_name='questions_as_second'
    )
    statement_a = models.TextField()  # Statement favoring attribute1
    statement_b = models.TextField()  # Statement favoring attribute2
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    order = models.IntegerField(default=0)  # For controlling question order
    
    class Meta:
        unique_together = ['business', 'attribute1', 'attribute2']
        ordering = ['order']
        
    def __str__(self):
        return f"{self.attribute1} vs {self.attribute2}"

class BenchmarkBatch(models.Model):
    """Represents a batch of benchmark assessments"""
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    data_file = models.FileField(
        upload_to='benchmark_data/',
        validators=[FileExtensionValidator(allowed_extensions=['xlsx', 'xls', 'csv'])]
    )
    processed = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.business.name} - {self.name}"

class Manager(models.Model):
    """Represents a manager who can be assigned to assessments"""
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='managers')
    name = models.CharField(max_length=255)
    region = models.CharField(max_length=255, default='')
    position = models.CharField(max_length=255, default='')
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.email})"
    
    class Meta:
        unique_together = ['business', 'email']
        ordering = ['name']

class Assessment(models.Model):
    """Represents an assessment sent to a candidate"""
    ASSESSMENT_TYPE_CHOICES = [
        ('standard', 'Standard Assessment'),
        ('benchmark', 'Benchmark Assessment'),
    ]
    
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    assessment_type = models.CharField(
        max_length=20, 
        choices=ASSESSMENT_TYPE_CHOICES,
        default='standard'
    )
    candidate_name = models.CharField(max_length=255)
    candidate_email = models.EmailField()
    position = models.CharField(max_length=255)
    region = models.CharField(max_length=100)
    manager_name = models.CharField(max_length=255)
    manager_email = models.EmailField()
    unique_link = models.CharField(max_length=64, unique=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    first_accessed_at = models.DateTimeField(null=True, blank=True)
    completion_time_seconds = models.IntegerField(null=True, blank=True)
    email_sent = models.BooleanField(default=False)

    managers = models.ManyToManyField(
        Manager,
        related_name='assessments',
        blank=True
    )

    benchmark_batch = models.ForeignKey(
        BenchmarkBatch, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assessment_set'
    )
    
    def save(self, *args, **kwargs):
        if not self.unique_link:
            self.unique_link = get_random_string(64)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Assessment for {self.candidate_name}"
    
    @property
    def formatted_completion_time(self):
        """Return a human-readable completion time"""
        if self.completion_time_seconds is None:
            return "Not completed"
            
        seconds = self.completion_time_seconds
        
        # Convert to hours, minutes, seconds
        hours, remainder = divmod(seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        
        if hours > 0:
            return f"{int(hours)}h {int(minutes)}m {int(seconds)}s"
        elif minutes > 0:
            return f"{int(minutes)}m {int(seconds)}s"
        else:
            return f"{int(seconds)}s"
        
    @property
    def status_display(self):
        """Return a status string for the assessment"""
        if self.completed:
            return "Completed"
        elif self.first_accessed_at:
            return "In Progress"
        else:
            return "Not Started"

    class Meta:
        ordering = ['-created_at']

class AssessmentResponse(models.Model):
    """Stores a candidate's responses to the assessment"""
    assessment = models.OneToOneField(Assessment, on_delete=models.CASCADE)
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Response for {self.assessment}"

    def get_score_for_attribute(self, attribute):
        """Calculate score for a specific attribute"""
        responses = self.questionresponse_set.filter(
            models.Q(question_pair__attribute1=attribute) | 
            models.Q(question_pair__attribute2=attribute)
        )
        
        if not responses:
            return 0
        
        score = 0
        total = 0
        
        for response in responses:
            if response.question_pair.attribute1 == attribute and response.chose_a:
                score += 1
            elif response.question_pair.attribute2 == attribute and not response.chose_a:
                score += 1
            total += 1
            
        return (score / total) * 100 if total > 0 else 0

class QuestionResponse(models.Model):
    """Stores individual responses to each question pair"""
    assessment_response = models.ForeignKey(AssessmentResponse, on_delete=models.CASCADE)
    question_pair = models.ForeignKey(QuestionPair, on_delete=models.CASCADE)
    chose_a = models.BooleanField()  # True if they chose statement_a, False if statement_b
    response_time = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['assessment_response', 'question_pair']
        ordering = ['question_pair__order']
    
    def __str__(self):
        choice = "A" if self.chose_a else "B"
        return f"Response {choice} for {self.question_pair}"
    
class EmailTemplate(models.Model):
    """Stores customized email templates for different purposes"""
    TEMPLATE_TYPE_CHOICES = [
        ('benchmark', 'Benchmark Assessment'),
        ('standard', 'Standard Assessment'),
    ]
    
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    template_type = models.CharField(max_length=20, choices=TEMPLATE_TYPE_CHOICES)
    subject = models.CharField(max_length=255)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['business', 'template_type']
        
    def __str__(self):
        return f"{self.business.name} - {self.get_template_type_display()}"
    
class TrainingMaterial(models.Model):
    """Represents a training material item shown on the training page (global)"""
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='book')
    color = models.CharField(max_length=20, default='#3b82f6')
    document_url = models.URLField(blank=True)
    order = models.IntegerField(default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['order', 'title']