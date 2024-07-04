import { asset } from '$fresh/runtime.ts'
import type { JSX } from 'preact'

export type AvailableIcons =
    | 'AddressCheck'
    | 'Alert'
    | 'AlertError'
    | 'AlertInfo'
    | 'AlertSuccess'
    | 'AlertWarning'
    | 'ArrowsPointingOut'
    | 'Bars3'
    | 'Check'
    | 'CheckoutRoundCheck'
    | 'ChevronDown'
    | 'ChevronLeft'
    | 'ChevronRight'
    | 'ChevronUp'
    | 'CreditCard'
    | 'Deco'
    | 'Diners'
    | 'Discord'
    | 'Discount'
    | 'Elo'
    | 'Facebook'
    | 'FilterList'
    | 'Heart'
    | 'Instagram'
    | 'Linkedin'
    | 'MagnifyingGlass'
    | 'MapPin'
    | 'Mastercard'
    | 'Message'
    | 'Minus'
    | 'Phone'
    | 'Pix'
    | 'Plus'
    | 'QuestionMarkCircle'
    | 'Return'
    | 'Ruler'
    | 'share'
    | 'ShoppingCart'
    | 'Star'
    | 'Google'
    | 'Tiktok'
    | 'Trash'
    | 'Truck'
    | 'Twitter'
    | 'User'
    | 'Visa'
    | 'WhatsApp'
    | 'XMark'
    | 'Zoom'

interface Props extends JSX.SVGAttributes<SVGSVGElement> {
    /**
     * Symbol id from element to render. Take a look at `/static/icons.svg`.
     *
     * Example: <Icon id="Bell" />
     */
    id: AvailableIcons
    size?: number
}

function Icon({ id, strokeWidth = 16, size, width, height, ...otherProps }: Props) {
    return (
        <svg {...otherProps} width={width ?? size} height={height ?? size} strokeWidth={strokeWidth}>
            <use href={asset(`/sprites.svg#${id}`)} />
        </svg>
    )
}

export default Icon
