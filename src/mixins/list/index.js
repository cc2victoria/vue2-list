/**
 *
 * @param {} param0
 * @returns
 */
export const listMixin = ({
    pageSize = 20,
    getListFunc = null,
    formatFunc = null,
    detailParams = null,
    params = {},
} = {}) => {
    return {
        props: {
            pageSize: {
                // 分页数
                type: Number,
                default: pageSize,
            },
            detailParams: {
                // 查询详情参数
                type: Object,
                default: detailParams,
            },
            getListFunc: {
                // 获取列表数据方法
                type: Function,
                default: getListFunc,
            },
            formatFunc: {
                // 格式化数据方法
                type: Function,
                default: formatFunc,
            },
        },
        data() {
            return {
                page: 1,
                params: params,
                showReachBottom: false, // 是否显示底部正在加载中
                showLoading: false, // 是否正在请求数据列表
                lists: [], // 列表
                data: {}, // 当前页返回的数据
                init: false,
                seeChannel: false, // 是否有查看文章（如果item内容，需要刷新数据）
                currentFollowUp: 0, // 用户当前查看的列表数据
                hasNext: false, // 是否有下一页
            };
        },

        /**
         * 页面显示时
         */
        created: function () {
            if (this.init) {
                this.setPageDataToInit();
            }
        },

        methods: {
            /**
             * 获取list列表数据
             * @praram Boolean refresh 是否是查看当前的文章（是的话，只用更新当前文章数据）
             */
            getPageData: async function (refresh = false) {
                let { lists, currentFollowUp, params, formatFunc } = this;

                // refresh 请求第n个用户
                const pageSize = refresh ? 1 : this.pageSize;
                let page = refresh ? currentFollowUp + 1 : this.page;
                let formatPairList = [];

                if (!this.getListFunc) {
                    console.error(
                        `Function Error: getListFunc is not defined in the Component. Please check your code!`
                    );
                }

                if (!refresh) {
                    this.showLoading = true;
                }

                if (refresh && this.detailParams) {
                    params = Object.assign({}, params, this.detailParams);
                }

                try {
                    const res = await this.getListFunc(
                        Object.assign({ page, pageSize }, params)
                    );

                    if (res.isError) {
                        this.page = page > 1 ? page - 1 : 1;
                        this.showLoading = false;

                        return Z.client.invoke('ui', 'showToast', {
                            content:
                                res.errorMessage || '网络异常，请稍后再试！',
                        });
                    }

                    const data = res.data;

                    formatPairList = res.data.list || [];

                    // 格式化数据
                    if (formatFunc && typeof formatFunc === 'function') {
                        formatPairList = formatPairList.map((res) => {
                            return formatFunc(res, res.data);
                        });
                    }

                    if (refresh) {
                        // 刷新当前进入列表详情页数据
                        this.$set(
                            `lists[${currentFollowUp}]`,
                            formatPairList[0]
                        );
                    } else {
                        this.lists =
                            page > 1
                                ? lists.concat(formatPairList)
                                : formatPairList;

                        this.data = res.data;
                        this.showLoading = false;
                        this.hasNext = data.hasNext;
                    }

                    // this.common.bus.$emit('ready', {
                    //     data: res.data || {},
                    //     params: { page, pageSize },
                    // });
                } catch (error) {
                    this.page = page > 1 ? page - 1 : 1;
                    this.showLoading = false;

                    return Z.client.invoke('ui', 'showToast', {
                        content: error.errorMessage || '网络异常，请稍后再试！',
                    });
                }
            },

            /**
             * 跟进页返回列表页回调
             */
            onRefresh: function (index) {
                this.seeChannel = true;
                this.currentFollowUp = index;
            },

            /**
             * 页面显示时
             */
            onPageShow: function () {
                if (this.seeChannel) {
                    // 进入子页面后刷新当前数据
                    this.getPageData(true);
                    this.seeChannel = false;
                }
            },

            /**
             * 立即刷新当前数据
             * @param {Event}} e
             */
            refeshData: function (index) {
                this.onRefresh(index);
                this.onPageShow();
            },

            /**
             * 查看当前item项
             */
            onItemTap: function ({ index, item }) {
                this.seeChannel = true;
                this.currentFollowUp = index;

                this.$emit('click', { item });
            },

            /**
             * 删除数据项
             * @param {Number} id
             */
            onItemDelete() {
                this.$set(`lists[${this.currentFollowUp}].isDel`, true);
            },

            /**
             * 列表请求恢复初始化
             */
            setPageDataToInit: function () {
                this.showReachBottom = false;
                this.showLoading = false;
                this.seeChannel = false;
                this.page = 1;
                this.lists = [];

                this.getPageData();
            },

            /**
             * 获取更多数据，一般用户上滑动到顶部的时候
             */
            getMorePageData: async function () {
                if (this.showLoading) {
                    return false;
                }

                if (!this.hasNext) {
                    // 显示已经到底了
                    this.showReachBottom = true;
                    this.showLoading = false;
                } else {
                    // 获取下一页数据
                    this.showLoading = true;
                    this.page = this.page + 1;
                    await this.getPageData();
                }
            },
        },
    };
};

export default listMixin;
