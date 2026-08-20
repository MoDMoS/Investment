import { pickSecFundRef, stripFundClassSuffix } from './quotes.service';

describe('SEC fund helpers', () => {
  it('strips class suffix from Thai fund tickers', () => {
    expect(stripFundClassSuffix('K-US500X-A(A)')).toBe('K-US500X');
    expect(stripFundClassSuffix('K-USXNDQ-A(A)')).toBe('K-USXNDQ');
    expect(stripFundClassSuffix('PTT')).toBeNull();
    expect(stripFundClassSuffix('K-US500X')).toBeNull();
  });

  it('picks fund class match over abbr-only', () => {
    const ref = pickSecFundRef(
      [
        {
          proj_id: 'M0257_2564',
          proj_abbr_name: 'K-US500X',
          fund_class_name: 'K-US500X-C(A)',
          fund_status: 'Registered',
        },
        {
          proj_id: 'M0257_2564',
          proj_abbr_name: 'K-US500X',
          fund_class_name: 'K-US500X-A(A)',
          fund_status: 'Registered',
        },
      ],
      'K-US500X-A(A)',
    );
    expect(ref).toEqual({
      projId: 'M0257_2564',
      fundClassName: 'K-US500X-A(A)',
    });
  });

  it('falls back to abbr with main class', () => {
    const ref = pickSecFundRef(
      [
        {
          proj_id: 'M0408_2567',
          proj_abbr_name: 'K-US500XRMF',
          fund_class_name: 'main',
          fund_status: 'Registered',
        },
      ],
      'K-US500XRMF',
    );
    expect(ref).toEqual({
      projId: 'M0408_2567',
      fundClassName: 'main',
    });
  });
});
