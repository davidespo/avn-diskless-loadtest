import { Toolbar } from "primereact/toolbar";
import { NavLink } from "react-router-dom";

import './Header.css'

export const Header = () => {
  return (
      <div className="header">
        <Toolbar
        className="bg-primary border-round"
        center={
          <div className="text-xl">
            <NavLink to="/load-test">
              Load Test
            </NavLink>
            <span className="mx-3">|</span>
            <NavLink to="/settings">
              Settings
            </NavLink>
          </div>
        }
      />
      </div>
  );
};
