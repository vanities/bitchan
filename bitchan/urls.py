from django.conf.urls import include, url
from django.contrib import admin
from django.http import HttpResponse

urlpatterns = [
    url(r"^admin/", admin.site.urls, name="admin"),
    url(
        r"^robots.txt",
        lambda x: HttpResponse(
            "User-Agent: *\n" "Disallow: /", content_type="text/plain"
        ),
        name="robots_file",
    ),
]
