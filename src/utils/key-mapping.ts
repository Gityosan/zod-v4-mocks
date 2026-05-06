import type { Faker } from '@faker-js/faker';
import { z } from 'zod';
import type { GeneraterOptions } from '../type';
import { safeInstanceof } from './schema';

export type KeyMapper = (
  key: string,
  schema: z.core.$ZodType,
  faker: Faker,
  options: GeneraterOptions,
) => unknown;

/** Normalize a key for matching: lowercased, separator-insensitive. */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_\- ]+/g, '');
}

/**
 * Built-in key → faker mapping for `keyMapping: 'auto'`. Only fires for
 * primitive leaf schemas (ZodString / ZodNumber / ZodBoolean / ZodDate)
 * so that user-defined formats and constraints take precedence.
 */
export const defaultKeyMapper: KeyMapper = (key, schema, faker) => {
  const isString = safeInstanceof(schema, z.ZodString);
  const isNumber = safeInstanceof(schema, z.ZodNumber);
  const isDate = safeInstanceof(schema, z.ZodDate);
  const isBool = safeInstanceof(schema, z.ZodBoolean);
  if (!isString && !isNumber && !isDate && !isBool) return undefined;

  const k = normalizeKey(key);

  // Strings — names / identity
  if (isString) {
    switch (k) {
      case 'firstname':
        return faker.person.firstName();
      case 'lastname':
      case 'surname':
      case 'familyname':
        return faker.person.lastName();
      case 'middlename':
        return faker.person.middleName();
      case 'fullname':
      case 'name':
      case 'displayname':
        return faker.person.fullName();
      case 'username':
      case 'login':
      case 'handle':
        return faker.internet.username();
      case 'email':
      case 'emailaddress':
      case 'mail':
        return faker.internet.email();
      case 'phone':
      case 'phonenumber':
      case 'tel':
      case 'telephone':
      case 'mobile':
        return faker.phone.number();
      case 'avatar':
      case 'avatarurl':
        return faker.image.avatar();
      case 'url':
      case 'website':
      case 'homepage':
      case 'link':
        return faker.internet.url();
      case 'ip':
      case 'ipaddress':
      case 'ipv4':
        return faker.internet.ipv4();
      case 'ipv6':
        return faker.internet.ipv6();
      case 'mac':
      case 'macaddress':
        return faker.internet.mac();
      case 'uuid':
      case 'guid':
        return faker.string.uuid();
      case 'slug':
        return faker.helpers.slugify(faker.lorem.words(3));
      case 'address':
      case 'streetaddress':
        return faker.location.streetAddress();
      case 'street':
        return faker.location.street();
      case 'city':
      case 'town':
        return faker.location.city();
      case 'state':
      case 'region':
      case 'province':
        return faker.location.state();
      case 'country':
        return faker.location.country();
      case 'countrycode':
        return faker.location.countryCode();
      case 'zip':
      case 'zipcode':
      case 'postalcode':
      case 'postcode':
        return faker.location.zipCode();
      case 'company':
      case 'companyname':
      case 'organization':
      case 'employer':
        return faker.company.name();
      case 'jobtitle':
      case 'job':
      case 'position':
      case 'role':
        return faker.person.jobTitle();
      case 'department':
        return faker.commerce.department();
      case 'product':
      case 'productname':
      case 'item':
      case 'itemname':
        return faker.commerce.productName();
      case 'description':
      case 'summary':
      case 'bio':
      case 'biography':
        return faker.lorem.sentence();
      case 'title':
      case 'headline':
        return faker.lorem.words({ min: 2, max: 5 });
      case 'content':
      case 'body':
      case 'text':
        return faker.lorem.paragraph();
      case 'comment':
      case 'note':
      case 'message':
        return faker.lorem.sentences(2);
      case 'color':
      case 'colour':
        return faker.color.human();
      case 'currency':
        return faker.finance.currencyCode();
      case 'iban':
        return faker.finance.iban();
      case 'creditcard':
      case 'cardnumber':
        return faker.finance.creditCardNumber();
      case 'language':
      case 'lang':
      case 'locale':
        return faker.location.countryCode();
      case 'timezone':
      case 'tz':
        return faker.location.timeZone();
      case 'gender':
      case 'sex':
        return faker.person.sex();
      case 'imageurl':
      case 'image':
      case 'photo':
      case 'picture':
        return faker.image.url();
      case 'filename':
        return faker.system.fileName();
      case 'filepath':
      case 'path':
        return faker.system.filePath();
      case 'mimetype':
        return faker.system.mimeType();
    }
  }

  // Numbers — common bounded fields
  if (isNumber) {
    switch (k) {
      case 'age':
        return faker.number.int({ min: 0, max: 110 });
      case 'price':
      case 'amount':
      case 'cost':
        return Number(faker.commerce.price());
      case 'quantity':
      case 'qty':
      case 'count':
        return faker.number.int({ min: 0, max: 1000 });
      case 'rating':
      case 'score':
        return faker.number.float({ min: 0, max: 5, fractionDigits: 1 });
      case 'percentage':
      case 'percent':
        return faker.number.int({ min: 0, max: 100 });
      case 'latitude':
      case 'lat':
        return faker.location.latitude();
      case 'longitude':
      case 'lng':
      case 'lon':
        return faker.location.longitude();
      case 'year':
        return faker.number.int({ min: 1970, max: new Date().getFullYear() });
    }
  }

  if (isDate) {
    switch (k) {
      case 'createdat':
      case 'created':
      case 'datecreated':
        return faker.date.past();
      case 'updatedat':
      case 'updated':
      case 'dateupdated':
      case 'modifiedat':
      case 'modified':
        return faker.date.recent();
      case 'deletedat':
      case 'deleted':
        return faker.date.recent();
      case 'birthdate':
      case 'dateofbirth':
      case 'dob':
        return faker.date.birthdate();
    }
  }

  if (isBool) {
    switch (k) {
      case 'isactive':
      case 'active':
      case 'enabled':
      case 'isenabled':
        return true;
      case 'isdeleted':
      case 'deleted':
      case 'isdisabled':
      case 'disabled':
        return false;
    }
  }

  return undefined;
};

/**
 * Resolve a key→value via the configured key mapping. Returns undefined
 * when there is no mapping or the mapping declines to handle the key.
 */
export function resolveKeyMapping(
  key: string,
  schema: z.core.$ZodType,
  options: GeneraterOptions,
): unknown {
  const mode = options.config.keyMapping;
  if (!mode || mode === 'off') return undefined;
  if (mode === 'auto') {
    return defaultKeyMapper(key, schema, options.faker, options);
  }
  if (typeof mode === 'function') {
    const v = mode(key, schema, options.faker, options);
    if (v !== undefined) return v;
    return defaultKeyMapper(key, schema, options.faker, options);
  }
  return undefined;
}
