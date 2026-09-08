import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom'

import { CustomerLayout, StaffLayout, ManagerLayout, AdminLayout, AuthLayout } from '@/layouts'
import { CustomerAccountRoute, RequireAuth, RequireRole } from '@/auth/RouteGuards'
import * as Staff from '@/features/StaffPages'
import * as Admin from '@/features/AdminPages'
import { PublicHomePage, PublicProductPage, PublicShopPage, PublicVisitStorePage } from '@/features/PublicReadPages'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from '@/features/AuthPages'
import { CartPage, CheckoutPage, MyOrdersPage, OrderConfirmationPage } from '@/features/CommercePages'
import { MyReservationsApiPage, ReservationConfirmationPage, ReservationPage } from '@/features/ReservationPages'
import { StaffCheckInPage, StaffLiveTablesPage } from '@/features/StaffOperationalPages'
import { AccountApiPage } from '@/features/AccountApiPage'
import { AdminLiveTablesPage, AdminTableManagementPage } from '@/features/AdminTableManagementPage'

// Legacy mapper to preserve the page props
export function legacyNavigate(reactRouterNavigate: ReturnType<typeof useNavigate>) {
  return (page: string) => {
    if (page.startsWith('product:')) {
      reactRouterNavigate(`/products/${page.slice('product:'.length)}`)
      return
    }
    switch (page) {
      case 'home': reactRouterNavigate('/'); break;
      case 'shop': reactRouterNavigate('/shop'); break;
      case 'product': reactRouterNavigate('/shop'); break;
      case 'cart': reactRouterNavigate('/cart'); break;
      case 'checkout': reactRouterNavigate('/checkout'); break;
      case 'order-confirm': reactRouterNavigate('/order-confirm'); break;
      case 'reserve': reactRouterNavigate('/reserve'); break;
      case 'reserve-confirm': reactRouterNavigate('/reserve-confirm'); break;
      case 'visit-store': reactRouterNavigate('/stores'); break;
      case 'login': reactRouterNavigate('/login'); break;
      case 'register': reactRouterNavigate('/register'); break;
      case 'account': reactRouterNavigate('/account'); break;
      case 'my-orders': reactRouterNavigate('/account/orders'); break;
      case 'my-reservations': reactRouterNavigate('/account/reservations'); break;

      case 'staff-dashboard': reactRouterNavigate('/staff'); break;
      case 'staff-tables': reactRouterNavigate('/staff/tables'); break;
      case 'staff-checkin': reactRouterNavigate('/staff/checkin'); break;
      case 'staff-orders': reactRouterNavigate('/staff/orders'); break;
      case 'staff-products': reactRouterNavigate('/staff/products'); break;

      case 'admin-dashboard': reactRouterNavigate('/admin'); break;
      case 'admin-tables': reactRouterNavigate('/admin/tables'); break;
      case 'admin-users': reactRouterNavigate('/admin/users'); break;
      case 'admin-staff': reactRouterNavigate('/admin/staff'); break;
      case 'admin-branches': reactRouterNavigate('/admin/branches'); break;
      default: reactRouterNavigate('/');
    }
  }
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <RouterContent />
    </BrowserRouter>
  )
}

function RouterContent() {
  const navigate = legacyNavigate(useNavigate())
  return (
    <Routes>
      {/* AUTH */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* CUSTOMER */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<PublicHomePage />} />
        <Route path="/shop" element={<PublicShopPage />} />
        <Route path="/products/:productId" element={<PublicProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders/:orderNumber/confirmation" element={<OrderConfirmationPage />} />
          <Route path="/account/orders" element={<MyOrdersPage />} />
        </Route>
        <Route path="/order-confirm" element={<Navigate to="/cart" replace />} />
        <Route element={<RequireAuth />}>
          <Route path="/reserve" element={<ReservationPage />} />
          <Route path="/reservations/:reservationNumber/confirmation" element={<ReservationConfirmationPage />} />
        </Route>
        <Route path="/reserve-confirm" element={<Navigate to="/reserve" replace />} />
        <Route path="/stores" element={<PublicVisitStorePage onReserve={() => navigate('reserve')} />} />
        <Route element={<CustomerAccountRoute />}>
          <Route path="/account" element={<AccountApiPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="/account/reservations" element={<MyReservationsApiPage />} />
        </Route>
      </Route>

      {/* STAFF */}
      <Route element={<RequireRole roles={['staff', 'manager', 'admin']} />}>
        <Route element={<StaffLayout />}>
          <Route path="/staff" element={<Staff.StaffDashboardPage />} />
          <Route path="/staff/tables" element={<StaffLiveTablesPage />} />
          <Route path="/staff/check-in" element={<StaffCheckInPage />} />
          <Route path="/staff/checkin" element={<Navigate to="/staff/check-in" replace />} />
          <Route path="/staff/orders" element={<Staff.StaffOrdersPage />} />
          <Route path="/staff/products" element={<Staff.StaffProductsPage />} />
          <Route path="/staff/users" element={<Staff.StaffUsersPage />} />
        </Route>
      </Route>

      {/* MANAGER */}
      <Route element={<RequireRole roles={['manager', 'admin']} />}>
        <Route element={<ManagerLayout />}>
          <Route path="/manager" element={<Staff.StaffDashboardPage />} />
          <Route path="/manager/tables" element={<AdminLiveTablesPage mode="manager" />} />
          <Route path="/manager/physical-tables" element={<AdminTableManagementPage mode="manager" />} />
          <Route path="/manager/check-in" element={<StaffCheckInPage />} />
          <Route path="/manager/checkin" element={<Navigate to="/manager/check-in" replace />} />
          <Route path="/manager/orders" element={<Staff.StaffOrdersPage />} />
          <Route path="/manager/products" element={<Staff.StaffProductsPage />} />
          <Route path="/manager/users" element={<Staff.StaffUsersPage />} />
        </Route>
      </Route>

      {/* ADMIN */}
      <Route element={<RequireRole roles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Admin.AdminDashboardPage />} />
          <Route path="/admin/tables" element={<AdminLiveTablesPage />} />
          <Route path="/admin/physical-tables" element={<AdminTableManagementPage mode="admin" />} />
          <Route path="/admin/orders" element={<Admin.AdminOrdersPage />} />
          <Route path="/admin/products" element={<Admin.AdminProductsPage />} />
          <Route path="/admin/users" element={<Admin.UserManagementPage />} />
          <Route path="/admin/staff" element={<Admin.StaffManagementPage />} />
          <Route path="/admin/branches" element={<Admin.BranchManagementPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
