/**
 * Components 统一导出（components/index.ts）
 *
 * 知识点：
 * 1. 不强制全部导出，业务侧主要用 import 路径引入
 * 2. base 组件作为通用，统一导出方便使用
 * 3. vue-tsc 对 `export { default as X } from './X.vue'` 直接再导出存在兼容问题，
 *    需先 import default 再 export，才能让 .ts 业务文件识别具名导出
 */
import BaseButton from './base/BaseButton.vue'
import BaseTable from './base/BaseTable.vue'
import BaseDialog from './base/BaseDialog.vue'
import BasePagination from './base/BasePagination.vue'
import RetryError from './base/RetryError.vue'
import CategoryIcon from './base/CategoryIcon.vue'
import EventCard from './event/EventCard.vue'
import EventFilter from './event/EventFilter.vue'
import OrderStatusTag from './order/OrderStatusTag.vue'
import PayCountdown from './order/PayCountdown.vue'
import SeatMap from './seat/SeatMap.vue'
import SeatArea from './seat/SeatArea.vue'
import SeatRow from './seat/SeatRow.vue'
import SeatItem from './seat/SeatItem.vue'

export {
  BaseButton,
  BaseTable,
  BaseDialog,
  BasePagination,
  RetryError,
  CategoryIcon,
  EventCard,
  EventFilter,
  OrderStatusTag,
  PayCountdown,
  SeatMap,
  SeatArea,
  SeatRow,
  SeatItem
}
