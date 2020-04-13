import re


descRE = re.compile(r'^[*] `(\w+)`: [^(]*\((\w+), ([^)]+)\)')


def parse_description(desc):
    options = {}
    for line in desc[desc.index('POST'):].splitlines():
        match = descRE.match(line)
        if not match:
            continue
        options[match.group(1)] = {'type': match.group(2),
                                   'required': match.group(3) == 'required'}
    return options


def remove_encrypted(value):
    if value == '$encrypted$':
        return ''
    if isinstance(value, list):
        return [remove_encrypted(item) for item in value]
    if isinstance(value, dict):
        return {k: remove_encrypted(v) for k, v in value.items()}
    return value


def get_post_fields(page, cache):
    options_page = cache.get_options(page)
    if options_page is None:
        return None

    if 'POST' not in options_page.r.headers.get('Allow', ''):
        return None

    if 'POST' in options_page.json['actions']:
        return options_page.json['actions']['POST']
    else:
        return parse_description(options_page.json['description'])
