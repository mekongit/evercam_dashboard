/* 
 * Original script by Josh Fraser (http://www.onlineaspect.com)
 * Continued by Jon Nylander, (jon at pageloom dot com)
 * According to both of us, you are absolutely free to do whatever 
 * you want with this code.
 * 
 * This code is  maintained at bitbucket.org as jsTimezoneDetect.
 */

/**
 * Namespace to hold all the code for timezone detection.
 */
var jzTimezoneDetector = new Object();

jzTimezoneDetector.HEMISPHERE_SOUTH = 'SOUTH';
jzTimezoneDetector.HEMISPHERE_NORTH = 'NORTH';
jzTimezoneDetector.HEMISPHERE_UNKNOWN = 'N/A';
jzTimezoneDetector.olson = {};

/**
 * A simple object containing information of utc_offset, which olson timezone key to use, 
 * and if the timezone cares about daylight savings or not.
 * 
 * @constructor
 * @param {string} offset - for example '-11:00'
 * @param {string} olson_tz - the olson Identifier, such as "America/Denver"
 * @param {boolean} uses_dst - flag for whether the time zone somehow cares about daylight savings.
 */
jzTimezoneDetector.TimeZone = function (offset, olson_tz, uses_dst) {
    this.utc_offset = offset;
    this.olson_tz = olson_tz;
    this.uses_dst = uses_dst;
}

/**
 * Prints out the result.
 * But before it does that, it calls this.ambiguity_check.
 */
jzTimezoneDetector.TimeZone.prototype.display = function() {
    this.ambiguity_check();
    var response_text = '<b>UTC-offset</b>: ' + this.utc_offset + '<br/>';
    response_text += '<b>Zoneinfo key</b>: ' + this.olson_tz + '<br/>';
    response_text += '<b>Zone uses DST</b>: ' + (this.uses_dst ? 'yes' : 'no') + '<br/>';
    
    return response_text;
}

/**
 * Checks if a timezone has possible ambiguities. I.e timezones that are similar.
 * 
 * If the preliminary scan determines that we're in America/Denver. We double check
 * here that we're really there and not in America/Mazatlan.
 * 
 * This is done by checking known dates for when daylight savings start for different
 * timezones.
 */
jzTimezoneDetector.TimeZone.prototype.ambiguity_check = function() {
    var local_ambiguity_list = jzTimezoneDetector.olson.ambiguity_list[this.olson_tz];
    
    if (typeof(local_ambiguity_list) == 'undefined') {
        return;
    }
    
    var length = local_ambiguity_list.length;
    
    for (var i = 0; i < length; i++) {
        var tz = local_ambiguity_list[i]

        if (jzTimezoneDetector.date_is_dst(jzTimezoneDetector.olson.dst_start_dates[tz])) {
            this.olson_tz = tz;
            return;
        }   
    }
}

/**
 * Checks whether a given date is in daylight savings time.
 * 
 * If the date supplied is after june, we assume that we're checking
 * for southern hemisphere DST.
 * 
 * @param {Date} date
 * @returns {boolean}
 */
jzTimezoneDetector.date_is_dst = function (date) {
    var base_offset = ( (date.getMonth() > 5 ? jzTimezoneDetector.get_june_offset() : jzTimezoneDetector.get_january_offset()) )
    
    var date_offset = jzTimezoneDetector.get_date_offset(date);
    
    return (base_offset - date_offset) != 0;
}

/** 
 * Gets the offset in minutes from UTC for a certain date.
 * 
 * @param date
 * @returns {number}
 */
jzTimezoneDetector.get_date_offset = function (date) {
    return -date.getTimezoneOffset();
}

/**
 * This function does some basic calculations to create information about 
 * the user's timezone.
 * 
 * Returns a primitive object on the format
 * {'utc_offset' : -9, 'dst': 1, hemisphere' : 'north'}
 * where dst is 1 if the region uses daylight savings.
 * 
 * @returns {Object}  
 */
jzTimezoneDetector.get_timezone_info = function () {
    var january_offset = jzTimezoneDetector.get_january_offset();
    
    var june_offset = jzTimezoneDetector.get_june_offset();
    
    var diff = january_offset - june_offset;

    if (diff < 0) {
        return {'utc_offset' : january_offset,
                'dst':  1,
                'hemisphere' : jzTimezoneDetector.HEMISPHERE_NORTH}
    }
    else if (diff > 0) {
        return {'utc_offset' : june_offset,
                'dst' : 1,
                'hemisphere' : jzTimezoneDetector.HEMISPHERE_SOUTH}
    }

    return {'utc_offset' : january_offset, 
            'dst': 0, 
            'hemisphere' : jzTimezoneDetector.HEMISPHERE_UNKNOWN}
}

jzTimezoneDetector.get_january_offset = function () {
    return jzTimezoneDetector.get_date_offset(new Date(2011, 0, 1, 0, 0, 0, 0));
}

jzTimezoneDetector.get_june_offset = function () {
    return jzTimezoneDetector.get_date_offset(new Date(2011, 5, 1, 0, 0, 0, 0));
}

/**
 * Uses get_timezone_info() to formulate a key to use in the olson.timezones dictionary.
 * 
 * Returns a primitive object on the format:
 * {'timezone': TimeZone, 'key' : 'the key used to find the TimeZone object'}
 * 
 * @returns Object 
 */
jzTimezoneDetector.determine_timezone = function () {
    var timezone_key_info = jzTimezoneDetector.get_timezone_info();
    
    var hemisphere_suffix = ''
        
    if (timezone_key_info.hemisphere == jzTimezoneDetector.HEMISPHERE_SOUTH) {
        hemisphere_suffix = ',s';
    }
    
    var tz_key = timezone_key_info.utc_offset + ',' + timezone_key_info.dst + hemisphere_suffix
    
    return {'timezone' : jzTimezoneDetector.olson.timezones[tz_key], 'key' : tz_key}
}

/**
 * The keys in this dictionary are comma separated as such:
 * 
 * First the offset compared to UTC time in minutes.
 *  
 * Then a flag which is 0 if the timezone does not take daylight savings into account and 1 if it does.
 * 
 * Thirdly an optional 's' signifies that the timezone is in the southern hemisphere, only interesting for timezones with DST.
 * 
 * The values of the dictionary are TimeZone objects.
 */
jzTimezoneDetector.olson.timezones = {
    '-720,0'   : new jzTimezoneDetector.TimeZone('-12:00','Etc/GMT+12', false),
    '-660,0'   : new jzTimezoneDetector.TimeZone('-11:00','Pacific/Pago_Pago', false),
    '-600,1'   : new jzTimezoneDetector.TimeZone('-11:00','America/Adak',true),
    '-660,1,s' : new jzTimezoneDetector.TimeZone('-11:00','Pacific/Apia', true),
    '-600,0'   : new jzTimezoneDetector.TimeZone('-10:00','Pacific/Honolulu', false),
    '-570,0'   : new jzTimezoneDetector.TimeZone('-10:30','Pacific/Marquesas',false),
    '-540,0'   : new jzTimezoneDetector.TimeZone('-09:00','Pacific/Gambier',false),
    '-540,1'   : new jzTimezoneDetector.TimeZone('-09:00','America/Anchorage', true),
    '-480,1'   : new jzTimezoneDetector.TimeZone('-08:00','America/Los_Angeles', true),
    '-480,0'   : new jzTimezoneDetector.TimeZone('-08:00','Pacific/Pitcairn',false),
    '-420,0'   : new jzTimezoneDetector.TimeZone('-07:00','America/Phoenix', false),
    '-420,1'   : new jzTimezoneDetector.TimeZone('-07:00','America/Denver', true),
    '-360,0'   : new jzTimezoneDetector.TimeZone('-06:00','America/Guatemala', false),
    '-360,1'   : new jzTimezoneDetector.TimeZone('-06:00','America/Chicago', true),
    '-360,1,s' : new jzTimezoneDetector.TimeZone('-06:00','Pacific/Easter',true),
    '-300,0'   : new jzTimezoneDetector.TimeZone('-05:00','America/Bogota', false),
    '-300,1'   : new jzTimezoneDetector.TimeZone('-05:00','America/New_York', true),
    '-270,0'   : new jzTimezoneDetector.TimeZone('-04:30','America/Caracas', false),
    '-240,1'   : new jzTimezoneDetector.TimeZone('-04:00','America/Halifax', true),
    '-240,0'   : new jzTimezoneDetector.TimeZone('-04:00','America/Santo_Domingo', false),
    '-240,1,s' : new jzTimezoneDetector.TimeZone('-04:00','America/Asuncion', true),
    '-210,1'   : new jzTimezoneDetector.TimeZone('-03:30','America/St_Johns', true),
    '-180,1'   : new jzTimezoneDetector.TimeZone('-03:00','America/Godthab', true),
    '-180,0'   : new jzTimezoneDetector.TimeZone('-03:00','America/Argentina/Buenos_Aires', false),
    '-180,1,s' : new jzTimezoneDetector.TimeZone('-03:00','America/Montevideo', true),
    '-120,0'   : new jzTimezoneDetector.TimeZone('-02:00','America/Noronha', false),
    '-120,1'   : new jzTimezoneDetector.TimeZone('-02:00','Etc/GMT+2', true),
    '-60,1'    : new jzTimezoneDetector.TimeZone('-01:00','Atlantic/Azores', true),
    '-60,0'    : new jzTimezoneDetector.TimeZone('-01:00','Atlantic/Cape_Verde', false),
    '0,0'      : new jzTimezoneDetector.TimeZone('00:00','Etc/UTC', false),
    '0,1'      : new jzTimezoneDetector.TimeZone('00:00','Europe/London', true),
    '60,1'     : new jzTimezoneDetector.TimeZone('+01:00','Europe/Berlin', true),
    '60,0'     : new jzTimezoneDetector.TimeZone('+01:00','Africa/Lagos', false),
    '60,1,s'   : new jzTimezoneDetector.TimeZone('+01:00','Africa/Windhoek',true),
    '120,1'    : new jzTimezoneDetector.TimeZone('+02:00','Asia/Beirut', true),
    '120,0'    : new jzTimezoneDetector.TimeZone('+02:00','Africa/Johannesburg', false),
    '180,1'    : new jzTimezoneDetector.TimeZone('+03:00','Europe/Moscow', true),
    '180,0'    : new jzTimezoneDetector.TimeZone('+03:00','Asia/Baghdad', false),
    '210,1'    : new jzTimezoneDetector.TimeZone('+03:30','Asia/Tehran', true),
    '240,0'    : new jzTimezoneDetector.TimeZone('+04:00','Asia/Dubai', false),
    '240,1'    : new jzTimezoneDetector.TimeZone('+04:00','Asia/Yerevan', true),
    '270,0'    : new jzTimezoneDetector.TimeZone('+04:30','Asia/Kabul', false),
    '300,1'    : new jzTimezoneDetector.TimeZone('+05:00','Asia/Yekaterinburg', true),
    '300,0'    : new jzTimezoneDetector.TimeZone('+05:00','Asia/Karachi', false),
    '330,0'    : new jzTimezoneDetector.TimeZone('+05:30','Asia/Kolkata', false),
    '345,0'    : new jzTimezoneDetector.TimeZone('+05:45','Asia/Kathmandu', false),
    '360,0'    : new jzTimezoneDetector.TimeZone('+06:00','Asia/Dhaka', false),
    '360,1'    : new jzTimezoneDetector.TimeZone('+06:00','Asia/Omsk', true),
    '390,0'    : new jzTimezoneDetector.TimeZone('+06:30','Asia/Rangoon', false),
    '420,1'    : new jzTimezoneDetector.TimeZone('+07:00','Asia/Krasnoyarsk', true),
    '420,0'    : new jzTimezoneDetector.TimeZone('+07:00','Asia/Jakarta', false),
    '480,0'    : new jzTimezoneDetector.TimeZone('+08:00','Asia/Shanghai', false),
    '480,1'    : new jzTimezoneDetector.TimeZone('+08:00','Asia/Irkutsk', true),
    '525,0'    : new jzTimezoneDetector.TimeZone('+08:45','Australia/Eucla', true),
    '525,1,s'  : new jzTimezoneDetector.TimeZone('+08:45','Australia/Eucla', true),
    '540,1'    : new jzTimezoneDetector.TimeZone('+09:00','Asia/Yakutsk', true),
    '540,0'    : new jzTimezoneDetector.TimeZone('+09:00','Asia/Tokyo', false),
    '570,0'    : new jzTimezoneDetector.TimeZone('+09:30','Australia/Darwin', false),
    '570,1,s'  : new jzTimezoneDetector.TimeZone('+09:30','Australia/Adelaide', true),
    '600,0'    : new jzTimezoneDetector.TimeZone('+10:00','Australia/Brisbane', false),
    '600,1'    : new jzTimezoneDetector.TimeZone('+10:00','Asia/Vladivostok', true),
    '600,1,s'  : new jzTimezoneDetector.TimeZone('+10:00','Australia/Sydney', true),
    '630,1,s'  : new jzTimezoneDetector.TimeZone('+10:30','Australia/Lord_Howe', true),
    '660,1'    : new jzTimezoneDetector.TimeZone('+11:00','Asia/Kamchatka', true),
    '660,0'    : new jzTimezoneDetector.TimeZone('+11:00','Pacific/Noumea', false),
    '690,0'    : new jzTimezoneDetector.TimeZone('+11:30','Pacific/Norfolk', false),
    '720,1,s'  : new jzTimezoneDetector.TimeZone('+12:00','Pacific/Auckland', true),
    '720,0'    : new jzTimezoneDetector.TimeZone('+12:00','Pacific/Tarawa', false),
    '765,1,s'  : new jzTimezoneDetector.TimeZone('+12:45','Pacific/Chatham', true),
    '780,0'    : new jzTimezoneDetector.TimeZone('+13:00','Pacific/Tongatapu', false),
    '840,0'    : new jzTimezoneDetector.TimeZone('+14:00','Pacific/Kiritimati', false)
}

/**
 * This object contains information on when daylight savings starts for
 * different timezones.
 * 
 * The list is short for a reason. Often we do not have to be very specific
 * to single out the correct timezone. But when we do, this list comes in
 * handy.
 * 
 * Each value is a date denoting when daylight savings starts for that timezone.
 */
jzTimezoneDetector.olson.dst_start_dates = {
    'America/Denver' : new Date(2011, 2, 13, 3, 0, 0, 0),
    'America/Mazatlan' : new Date(2011, 3, 3, 3, 0, 0, 0),
    'America/Chicago' : new Date(2011, 2, 13, 3, 0, 0, 0),
    'America/Mexico_City' : new Date(2011, 3, 3, 3, 0, 0, 0),
    'Atlantic/Stanley' : new Date(2011, 8, 4, 7, 0, 0, 0),
    'America/Asuncion' : new Date(2011, 9, 2, 3, 0, 0, 0),
    'America/Santiago' : new Date(2011, 9, 9, 3, 0, 0, 0),
    'America/Campo_Grande' : new Date(2011, 9, 16, 5, 0, 0, 0),
    'America/Montevideo' : new Date(2011, 9, 2, 3, 0, 0, 0),
    'America/Sao_Paulo' : new Date(2011, 9, 16, 5, 0, 0, 0),
    'America/Los_Angeles' : new Date(2011, 2, 13, 8, 0, 0, 0),
    'America/Santa_Isabel' : new Date(2011, 3, 5, 8, 0, 0, 0),
    'America/Havana' : new Date(2011, 2, 13, 2, 0, 0, 0),
    'America/New_York' : new Date(2011, 2, 13, 7, 0, 0, 0),
    'Asia/Gaza' : new Date(2011, 2, 26, 23, 0, 0, 0),
    'Asia/Beirut' : new Date(2011, 2, 27, 1, 0, 0, 0),
    'Europe/Minsk' : new Date(2011, 2, 27, 3, 0, 0, 0),
    'Europe/Istanbul' : new Date(2011, 2, 27, 7, 0, 0, 0),
    'Asia/Damascus' : new Date(2011, 3, 1, 2, 0, 0, 0),
    'Asia/Jerusalem' : new Date(2011, 3, 1, 6, 0, 0, 0),
    'Africa/Cairo' : new Date(2011, 3, 29, 4, 0, 0, 0),
    'Asia/Yerevan' : new Date(2011, 2, 27, 4, 0, 0, 0),
    'Asia/Baku'    : new Date(2011, 2, 27, 8, 0, 0, 0),
    'Pacific/Auckland' : new Date(2011, 8, 26, 7, 0, 0, 0),
    'Pacific/Fiji' : new Date(2010, 11, 29, 23, 0, 0, 0),
    'America/Halifax' : new Date(2011, 2, 13, 6, 0, 0, 0),
    'America/Goose_Bay' : new Date(2011, 2, 13, 2, 1, 0, 0),
    'America/Miquelon' : new Date(2011, 2, 13, 5, 0, 0, 0),
    'America/Godthab' : new Date(2011, 2, 27, 1, 0, 0, 0)
}

/**
 * The keys in this object are timezones that we know may be ambiguous after
 * a preliminary scan through the olson_tz object.
 * 
 * The array of timezones to compare must be in the order that daylight savings
 * starts for the regions.
 */
jzTimezoneDetector.olson.ambiguity_list = {
    'America/Denver' : ['America/Denver','America/Mazatlan'],
    'America/Chicago' : ['America/Chicago','America/Mexico_City'],
    'America/Asuncion' : ['Atlantic/Stanley', 'America/Asuncion', 'America/Santiago','America/Campo_Grande'],
    'America/Montevideo' : ['America/Montevideo', 'America/Sao_Paulo'],
    'Asia/Beirut' : ['Asia/Gaza','Asia/Beirut', 'Europe/Minsk', 'Europe/Istanbul', 'Asia/Damascus', 'Asia/Jerusalem','Africa/Cairo'],
    'Asia/Yerevan' : ['Asia/Yerevan', 'Asia/Baku'],
    'Pacific/Auckland' : ['Pacific/Auckland', 'Pacific/Fiji'],
    'America/Los_Angeles' : ['America/Los_Angeles', 'America/Santa_Isabel'],
    'America/New_York' : ['America/Havana','America/New_York'],
    'America/Halifax' : ['America/Goose_Bay','America/Halifax'],
    'America/Godthab' : ['America/Miquelon', 'America/Godthab']
}
function MapOptions(key){

switch (key)
{
case '-720,0':
    return 'Dateline Standard Time'
    break;
case '-660,0':
    return 'UTC-11'
    break;
case '-600,1':
    return 'UTC-11'
    break;
case '-660,1,s':
    return 'Samoa Standard Time'
    break;
case '-600,0':
    return 'Hawaiian Standard Time'
    break;
case '-570,0':
    return ''
    break;
case '-540,0':
    return 'Alaskan Standard Time'
    break;
case '-540,1':
    return 'Alaskan Standard Time'
    break;
case '-480,1':
    return 'Pacific Standard Time'
    break;
case '-480,0':
    return 'Pacific Standard Time'
    break;
case '-420,0':
    return 'Mountain Standard Time'
    break;
case '-420,1':
    return 'Mountain Standard Time'
    break;
case '-360,0':
    return 'Central Standard Time'
    break;
case '-360,1':
    return 'Central Standard Time'
    break;
case '-360,1,s':
    return 'Central Standard Time'
    break;
case '-300,0':
    return 'SA Pacific Standard Time'
    break;
case '-300,1':
    return 'Eastern Standard Time'
    break;
case '-270,0':
    return 'Dateline Standard Time'
    break;
case '-240,1':
    return 'Atlantic Standard Time'
    break;
case '-240,0':
    return 'Atlantic Standard Time'
    break;
case '-240,1,s':
    return 'Atlantic Standard Time'
    break;
case '-210,1':
    return 'Newfoundland Standard Time'
    break;
case '-180,1':
    return 'Greenland Standard Time'
    break;
case '-180,0':
    return 'Argentina Standard Time'
    break;
case '-180,1,s':
    return 'Montevideo Standard Time'
    break;
case '-120,0':
    return 'Mid-Atlantic Standard Time'
    break;
case '-120,1':
    return 'UTC-02'
    break;
case '-60,1':
    return 'Azores Standard Time'
    break;
case '-60,0':
    return 'Cape Verde Standard Time'
    break;
case '0,0':
    return 'UTC'
    break;
case '0,1':
    return 'GMT Standard Time'
    break;
case '60,1':
    return 'W. Europe Standard Time'
    break;
case '60,0':
    return 'W. Central Africa Standard Time'
    break;
case '60,1,s':
    return 'Central Europe Standard Time'
    break;
case '120,1':
    return 'Middle East Standard Time'
    break;
case '120,0':
    return 'South Africa Standard Time'
    break;
case '180,1':
    return 'Russian Standard Time'
    break;
case '180,0':
    return 'Arabic Standard Time'
    break;
case '210,1':
    return 'Iran Standard Time'
    break;
case '240,0':
    return 'Arabian Standard Time'
    break;
case '240,1':
    return 'Caucasus Standard Time'
    break;
case '270,0':
    return 'Afghanistan Standard Time'
    break;
case '300,1':
    return 'Ekaterinburg Standard Time'
    break;
case '300,0':
    return 'Pakistan Standard Time'
    break;
case '330,0':
    return 'India Standard Time'
    break;
case '345,0':
    return 'Nepal Standard Time'
    break;
case '360,0':
    return 'Bangladesh Standard Time'
    break;
case '360,1':
    return 'Central Asia Standard Time'
    break;
case '390,0':
    return 'Myanmar Standard Time'
    break;
case '420,1':
    return 'North Asia Standard Tim'
    break;
case '420,0':
    return 'SE Asia Standard Time'
    break;
case '480,0':
    return 'China Standard Time'
    break;
case '480,1':
    return 'North Asia East Standard Time'
    break;
case '525,0':
    return ''
    break;
case '525,1,s':
    return ''
    break;
case '540,1':
    return 'Yakutsk Standard Time'
    break;
case '540,0':
    return 'Tokyo Standard Time'
    break;
case '570,0':
    return 'AUS Central Standard Time'
    break;
case '570,1,s':
    return 'Cen. Australia Standard Tim'
    break;
case '600,0':
    return 'E. Australia Standard Time'
    break;
case '600,1':
    return 'Vladivostok Standard Time'
    break;
case '600,1,s':
    return 'AUS Eastern Standard Time'
    break;
case '630,1,s':
    return ''
    break;
case '660,1':
    return 'Magadan Standard Time'
    break;
case '660,0':
    return 'Central Pacific Standard Time'
    break;
case '690,0':
    return ''
    break;
case '720,1,s':
    return 'New Zealand Standard Time'
    break;
case '720,0':
    return 'UTC+12'
    break;
case '765,1,s':
    return ''
    break;
case '780,0':
    return 'Tonga Standard Time'
    break;
case '840,0':
    return ''
    break;
default:
  document.write("I'm looking forward to this weekend!");
}
 
}

function GetUtcZoneValue(key) {

  switch (key) {
    case '-720,0':
      return 'Dateline Standard Time';
      break;
    case '-660,0':
      return 'UTC-11';
      break;
    case '-600,1':
      return 'UTC-11';
      break;
    case '-660,1,s':
      return '(UTC-11:00) Samoa';
      break;
    case '-600,0':
      return 'Hawaiian Standard Time';
      break;
    case '-570,0':
      return '';
      break;
    case '-540,0':
      return 'Alaskan Standard Time';
      break;
    case '-540,1':
      return 'Alaskan Standard Time';
      break;
    case '-480,1':
      return 'Pacific Standard Time';
      break;
    case '-480,0':
      return 'Pacific Standard Time';
      break;
    case '-420,0':
      return 'Mountain Standard Time';
      break;
    case '-420,1':
      return 'Mountain Standard Time';
      break;
    case '-360,0':
      return 'Central Standard Time';
      break;
    case '-360,1':
      return 'Central Standard Time';
      break;
    case '-360,1,s':
      return 'Central Standard Time';
      break;
    case '-300,0':
      return 'SA Pacific Standard Time';
      break;
    case '-300,1':
      return 'Eastern Standard Time';
      break;
    case '-270,0':
      return 'Dateline Standard Time';
      break;
    case '-240,1':
      return 'Atlantic Standard Time';
      break;
    case '-240,0':
      return 'Atlantic Standard Time';
      break;
    case '-240,1,s':
      return 'Atlantic Standard Time';
      break;
    case '-210,1':
      return 'Newfoundland Standard Time';
      break;
    case '-180,1':
      return 'Greenland Standard Time';
      break;
    case '-180,0':
      return 'Argentina Standard Time';
      break;
    case '-180,1,s':
      return 'Montevideo Standard Time';
      break;
    case '-120,0':
      return 'Mid-Atlantic Standard Time';
      break;
    case '-120,1':
      return 'UTC-02';
      break;
    case '-60,1':
      return 'Azores Standard Time';
      break;
    case '-60,0':
      return 'Cape Verde Standard Time';
      break;
    case '0,0':
      return 'UTC';
      break;
    case '0,1':
      return 'GMT Standard Time';
      break;
    case '60,1':
      return 'W. Europe Standard Time';
      break;
    case '60,0':
      return 'W. Central Africa Standard Time';
      break;
    case '60,1,s':
      return 'Central Europe Standard Time';
      break;
    case '120,1':
      return 'Middle East Standard Time';
      break;
    case '120,0':
      return 'outh Africa Standard Time';
      break;
    case '180,1':
      return 'Russian Standard Time';
      break;
    case '180,0':
      return 'Arabic Standard Time';
      break;
    case '210,1':
      return 'Iran Standard Time';
      break;
    case '240,0':
      return 'Arabian Standard Time';
      break;
    case '240,1':
      return 'Caucasus Standard Time';
      break;
    case '270,0':
      return 'Afghanistan Standard Time';
      break;
    case '300,1':
      return 'Ekaterinburg Standard Time';
      break;
    case '300,0':
      return 'Pakistan Standard Time';
      break;
    case '330,0':
      return 'India Standard Time';
      break;
    case '345,0':
      return 'Nepal Standard Time';
      break;
    case '360,0':
      return 'Bangladesh Standard Time';
      break;
    case '360,1':
      return 'Central Asia Standard Time';
      break;
    case '390,0':
      return 'Myanmar Standard Time';
      break;
    case '420,1':
      return 'North Asia Standard Time';
      break;
    case '420,0':
      return 'SE Asia Standard Time';
      break;
    case '480,0':
      return 'China Standard Time';
      break;
    case '480,1':
      return 'North Asia East Standard Time';
      break;
    case '525,0':
      return '';
      break;
    case '525,1,s':
      return '';
      break;
    case '540,1':
      return 'Yakutsk Standard Time';
      break;
    case '540,0':
      return 'Tokyo Standard Time';
      break;
    case '570,0':
      return 'AUS Central Standard Time';
      break;
    case '570,1,s':
      return 'Cen. Australia Standard Time';
      break;
    case '600,0':
      return 'E. Australia Standard Time';
      break;
    case '600,1':
      return 'Vladivostok Standard Time';
      break;
    case '600,1,s':
      return 'AUS Eastern Standard Time';
      break;
    case '630,1,s':
      return '';
      break;
    case '660,1':
      return 'Magadan Standard Time';
      break;
    case '660,0':
      return 'Central Pacific Standard Time';
      break;
    case '690,0':
      return '';
      break;
    case '720,1,s':
      return 'New Zealand Standard Time';
      break;
    case '720,0':
      return 'UTC+12';
      break;
    case '765,1,s':
      return '';
      break;
    case '780,0':
      return "Tonga Standard Time";
      break;
    case '840,0':
      return '';
      break;
    default:
      return '';
  }
}