# Generated by Django 5.1.4 on 2025-03-24 15:25

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('baseapp', '0011_assessment_completion_time_seconds_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='manager',
            name='position',
            field=models.CharField(default='None', max_length=255),
        ),
        migrations.AddField(
            model_name='manager',
            name='region',
            field=models.CharField(default='None', max_length=255),
        ),
    ]
