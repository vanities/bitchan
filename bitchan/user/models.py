from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import ugettext_lazy as _
from web3auth.utils import validate_eth_address


class User(AbstractUser):
    address = models.CharField(
        max_length=42,
        verbose_name=_("Ethereum wallet address"),
        unique=True,
        validators=[validate_eth_address],
        null=True,
        blank=True,
    )

    def __str__(self):
        return self.username
