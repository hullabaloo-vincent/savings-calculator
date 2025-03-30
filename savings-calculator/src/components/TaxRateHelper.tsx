export function getSuggestedTaxRate(preTaxInterest: number): number {
    // 10%: $0 – $11,000
    // 12%: $11,000 – $44,725
    // 22%: $44,725 – $95,375
    // 24%: $95,375 – $182,100
    // 32%: $182,100 – $231,250
    // 35%: $231,250 – $578,125
    // 37%: $578,125+
    const brackets = [
        {max: 11000, rate: 10},
        {max: 44725, rate: 12},
        {max: 95375, rate: 22},
        {max: 182100, rate: 24},
        {max: 231250, rate: 32},
        {max: 578125, rate: 35},
        {max: Number.MAX_SAFE_INTEGER, rate: 37},
    ];

    const bracket = brackets.find((b) => preTaxInterest <= b.max);
    return bracket ? bracket.rate : 37;
}