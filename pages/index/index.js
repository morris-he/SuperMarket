//index.js
//获取应用实例
const app = getApp()
let timer;

Page({
  data: {
    currentData: 0,
    token: '',
    categories: [],
    foots: [],
    page: 1,
    scrollRight: 0,
    showView: false,
    carts: [],
    cart_nums: {},
    count: {},
    hint: {
      show: false,
      success: true,
      message: ""
    },
    loading: true
  },

  // 初始化
  onLoad: function(options) {

    // 仅验证用户是否登录，获取token
    wx.login({
      success: res => {
        console.log(res)
        wx.request({
          url: 'https://canteen.canon4ever.com/api/auth',
          method: 'POST',
          data: {
            code: res.code
          },
          success: res => {
            console.log(res)
            this.setData({
              'token': 'Bearer' + res.data.token,
              loading: false
            })
            this.initFoots()
            this.initCarts()
          }
        })
      }
    })
    // 购物车监听加载
    showView: (options.showView == "true" ? true : false)
  },

  //获取分类和食品信息
  initFoots() {
    wx.request({
      url: 'https://canteen.canon4ever.com/api',
      header: {
        'Authorization': this.data.token
      },
      success: (res) => {
        this.setData({
          categories: res.data.data,
          foots: res.data.data[0].products
        })
      }
    })
  },

  //获取购物车信息
  initCarts() {
    wx.request({
      url: 'https://canteen.canon4ever.com/api/cart',
      header: {
        'Authorization': this.data.token
      },
      success: (res) => {
        this.setData({
          carts: res.data.data.carts,
          cart_nums: res.data.data.cart_nums,
          count: res.data.data.count
        })
      }
    });
  },
  //点击切换栏目,index赋值
  checkCurrent: function(e) {
    const that = this;
    let index = e.target.dataset.current
    if (that.data.currentData == index) {
      return false;
    } else {
      that.setData({
        currentData: index,
        foots: this.data.categories[index].products
      })
      console.log(this.data.foots)
    }
  },

  /** 购物车 点击显示 **/
  toggleBtn: function() {
    this.setData({
      showView: true
    })
  },
  /** 购物车 点击隐藏 **/
  closeShoppingCart() {
    this.setData({
      showView: false
    })
  },

  //点击添加商品
  addFood(event) {
    let product_id = event.currentTarget.dataset.product_id;
    wx.request({
      url: 'https://canteen.canon4ever.com/api/cart',
      header: {
        'Authorization': this.data.token
      },
      method: "POST",
      data: {
        product_id: product_id
      },
      success: (res) => {
        if (res.statusCode == 429) {
          this.show_hint({
            show: true,
            success: false,
            message: "请求次数过多，请稍后再试！"
          })
          return;
        }

        this.updateData(res.data);
        this.show_hint(res.data);
      }
    });
  },

  //修改商品数量
  changeNum(event) {
    let cart_id = event.currentTarget.dataset.cart_id;
    let type = event.currentTarget.dataset.type;

    wx.request({
      url: 'https://canteen.canon4ever.com/api/cart',
      header: {
        'Authorization': this.data.token
      },
      method: "PUT",
      data: {
        cart_id: cart_id,
        type: type
      },
      success: (res) => {
        if (res.statusCode == 429) {
          this.show_hint({
            show: true,
            success: false,
            message: "请求次数过多，请稍后再试！"
          })
          return;
        }

        this.updateData(res.data);
        this.show_hint(res.data);
      }
    });
  },

  //清空购物车
  clearCart() {
    wx.request({
      url: 'https://canteen.canon4ever.com/api/cart/clear_cart',
      header: {
        'Authorization': this.data.token
      },
      method: "DELETE",
      success: (res) => {
        if (res.statusCode == 429) {
          this.show_hint({ show: true, success: false, message: "请求次数过多，请稍后再试！" })
          return;
        }

        this.updateData(res.data);
        this.show_hint(res.data);
      }
    });
  },

  //更新数据
  updateData(data) {
    this.setData({
      carts: data.data.carts,
      cart_nums: data.data.cart_nums,
      count: data.data.count
    })
  },

  //显示提示信息
  show_hint(data) {
    clearTimeout(timer);
    this.setData({
      hint: {
        show: true,
        success: data.success,
        message: data.message
      }
    })

    timer = setTimeout(() => {
      this.setData({
        hint: {
          show: false,
          success: data.success,
          message: data.message
        }
      })
    }, 1500)
  },

  // 允许从相机和相册扫码,在html中bindtap绑定事件
  scan() {
    wx.scanCode({
      onlyFromCamera: true,
      success: (res) => {
        let code = res.result;
        wx.request({
          url: 'https://canteen.canon4ever.com/api/cart/scan',
          header: {
            'Authorization': this.data.token
          },
          method: "POST",
          data: {
            code: code
          },
          success: (res) => {
            if (res.statusCode == 429) {
              this.show_hint({
                show: true,
                success: false,
                message: "请求次数过多，请稍后再试！"
              })
              return;
            }

            this.updateData(res.data);
            this.show_hint(res.data);
          }
        });
      }
    })
  },

  //支付
  pay() {

    if (this.data.count.num == 0) {
      this.show_hint({ show: true, success: false, message: "东西都不选，你买个啥啊？" })
      return;
    }

    wx.request({
      url: 'https://canteen.canon4ever.com/api/order/pay',
      header: {
        'Authorization': this.data.token
      },
      success: (res) => {

        let that = this;

        wx.requestPayment(
          {
            'timeStamp': res.data.timestamp,
            'nonceStr': res.data.nonceStr,
            'package': res.data.package,
            'signType': res.data.signType,
            'paySign': res.data.paySign,

            //成功回调
            'success': function (res) {
              that.setData({
                show_cart: false,
                carts: [],
                cart_nums: {},
                count: { num: 0, total_price: 0 }
              })
              that.show_hint({ show: true, success: true, message: "支付成功！" })
            },

            //失败回调
            'fail': function (res) {

              //是否用户主动取消？
              if (res.errMsg == "requestPayment:fail cancel") {
                that.show_hint({ show: true, success: false, message: "你咋取消了支付呢？赶紧买啊！" });
                return;
              }

              //系统故障
              that.show_hint({ show: true, success: false, message: "Shit，谁开发的渣渣，挂球了！叫人吧！" })
            },
            'complete': function (res) { }
          })
      }
    });
  }
})