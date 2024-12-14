export function filterByPercentRanks(arr: any[], valueKey: string, threshold: number | null = null) {
  console.log(arr, valueKey, threshold)
  let values = arr.map(item => item[valueKey])
  values.sort((a, b) => a - b)
  let len = values.length
  arr.forEach(item => {
    if(len <= 1) {
      item.percentRank = 100
    } else {
      let value = item[valueKey]
      let rank = 0
      for (let i = 0; i < len; i++) {
        if (values[i] < value) {
          rank++
        }
      }
      let adjustedPercentile = (rank / (len - 1)) * 100
      item.percentRank = adjustedPercentile
    }
  })

  if (threshold !== undefined && threshold !== null) {
    arr = arr.filter(item => item.percentRank >= threshold)
  }

  return arr
}

export function calculateRelativeSizePercent(array: any[], sizeProperty1: string, sizeProperty2: string | null = null) {
  let minSize: number, maxSize: number
  if (sizeProperty2) {
    minSize = Math.min(...array.map(obj => Math.min(obj[sizeProperty1], obj[sizeProperty2])))
    maxSize = Math.max(...array.map(obj => Math.max(obj[sizeProperty1], obj[sizeProperty2])))
  } else {
    minSize = Math.min(...array.map(obj => obj[sizeProperty1]))
    maxSize = Math.max(...array.map(obj => obj[sizeProperty1]))
  }

  const sizeRange = maxSize - minSize

  const updatedArray = array.map(obj => {
    const sizePercent1 = sizeRange > 0 ? ((obj[sizeProperty1] - minSize) / sizeRange) * 100 : 100
    const updatedObj1 = {
      ...obj,
      ['sizePercent_' + sizeProperty1]: parseFloat(sizePercent1.toFixed(2))
    }

    if (sizeProperty2) {
      const sizePercent2 = sizeRange > 0 ? ((obj[sizeProperty2] - minSize) / sizeRange) * 100 : 100
      return {
        ...updatedObj1,
        ['sizePercent_' + sizeProperty2]: parseFloat(sizePercent2.toFixed(2))
      }
    }

    return updatedObj1
  })

  return updatedArray
}

export function formatNumber(number: number) {
  return new Intl.NumberFormat('en-US').format(number)
}

