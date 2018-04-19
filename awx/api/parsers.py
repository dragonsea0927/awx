# Python
from collections import OrderedDict
import json

# Django
from django.conf import settings
from django.utils import six
from django.utils.translation import ugettext_lazy as _

# Django REST Framework
from rest_framework import parsers
from rest_framework.exceptions import ParseError


class JSONParser(parsers.JSONParser):
    """
    Parses JSON-serialized data, preserving order of dictionary keys.
    """

    def parse(self, stream, media_type=None, parser_context=None):
        """
        Parses the incoming bytestream as JSON and returns the resulting data.
        """
        parser_context = parser_context or {}
        encoding = parser_context.get('encoding', settings.DEFAULT_CHARSET)

        try:
            data = stream.read().decode(encoding)
            if not data:
                return {}
            obj = json.loads(data, object_pairs_hook=OrderedDict)
            if not isinstance(obj, dict) and obj is not None:
                raise ParseError(_('JSON parse error - not a JSON object'))
            return obj
        except ValueError as exc:
            raise ParseError(_('JSON parse error - %s\nPossible cause: trailing comma.' % six.text_type(exc)))
