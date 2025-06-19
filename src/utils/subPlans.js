const subPlans = {
  vip: {
    title: '尊爵黑卡',
    price: 2999,
    duration: 365,
    benefits:[
      {
        "benefit": "VIP 專屬特調 1 次",
        "counts": 3
      },
      {
        "benefit": "合作酒吧招待飲品 1 次",
        "counts": 6
      },
      {
        "benefit": "合作酒吧招待小點 1 次",
        "counts": 6
      }
    ]
  },
  seasonal: {
    title: '季訂方案',
    price: 1999,
    duration: 90,
    benefits:[
      {
        "benefit": "VIP 專屬特調 1 次",
        "counts": 2
      },
      {
        "benefit": "合作酒吧招待飲品 1 次",
        "counts": 3
      },
      {
        "benefit": "合作酒吧招待小點 1 次",
        "counts": 3
      }
    ]
  },
  monthly: {
    title: '小資月卡',
    price: 999,
    duration: 30,
    benefits:[
      {
        "benefit": "VIP 專屬特調 1 次",
        "counts": 1
      },
      {
        "benefit": "合作酒吧招待飲品 1 次",
        "counts": 1
      },
      {
        "benefit": "合作酒吧招待小點 1 次",
        "counts": 1
      }
    ]
  }
}

module.exports = { subPlans };