from django.conf.urls import include, url
from django.contrib import admin
from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.views.generic import RedirectView

from web3auth import urls as web3auth_urls


def login(request):
    if not request.user.is_authenticated:
        return render(request, "web3auth/login.html")
    else:
        return redirect("/admin/login")


def auto_login(request):
    if not request.user.is_authenticated:
        return render(request, "web3auth/autologin.html")
    else:
        return redirect("/admin/login")


urlpatterns = [
    url(r"^$", RedirectView.as_view(url="/login")),
    url(r"^admin/", admin.site.urls, name="admin"),
    url(r"^login/", login, name="login"),
    url(r"^auto_login/", auto_login, name="autologin"),
    url(r"^", include(web3auth_urls)),
    url(
        r"^robots.txt",
        lambda x: HttpResponse(
            "User-Agent: *\n" "Disallow: /", content_type="text/plain"
        ),
        name="robots_file",
    ),
]
