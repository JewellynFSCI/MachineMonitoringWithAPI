using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using MachineMonitoring.Models;
using MachineMonitoring.DataAccess.Repository;


namespace MachineMonitoring.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly HomeRepo _homerepo;


        public HomeController(ILogger<HomeController> logger, HomeRepo homerepo)
        {
            _logger = logger;
            _homerepo = homerepo;
        }

        

        public IActionResult Login()
        {
            return View();
        }


        #region 'Login - POST'
        public async Task<ActionResult<SystemUser>> LoginUser(SystemUser model)
        {
            IEnumerable<SystemUser> AllEmployee = await _homerepo.GetUserRepo();

            SystemUser? foundEmployee = AllEmployee.SingleOrDefault(e => e.EmployeeNo == model.EmployeeNo);


            //var user =CheckCredential.FirstOrDefault();
            
            if(foundEmployee == null)
            {
                return Json(new { success = false, message = "Empno or password is incorrect!" });
            }
            else if (foundEmployee.IsActive == false)
            {
                return Json(new { success = false, message = "Employee Number is not active user for this system." });
            } 
            else if (foundEmployee.AuthorityLevel == 1)  //SYSTEM ADMIN
            {
                SetSession(foundEmployee);
                return Json(new { success = true, redirectUrl = Url.Action("ProductionMaps", "Admin") });
            }
            else if (foundEmployee.AuthorityLevel == 3)  //ADMIN (SUPERVISOR)
            {
                SetSession(foundEmployee);
                return Json(new { success = true, redirectUrl = Url.Action("MachineLocation", "Admin") });
            }
            else
            {
                SetSession(foundEmployee);
                return Json(new { success = true, redirectUrl = Url.Action("MEDashboard", "Home") });
            }     
        }
        #endregion

        #region 'Set Session'
        public void SetSession(SystemUser model)
        {
            HttpContext.Session.SetString("EmployeeNo", model.EmployeeNo);
            HttpContext.Session.SetString("EmployeeName", model.EmployeeName);
            HttpContext.Session.SetString("AuthorityLevel", model.AuthorityLevel.ToString());
            HttpContext.Session.SetString("AuthorityName", model.AuthorityName);
        }
        #endregion

        #region 'Logout'
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Login", "Home");
        }
        #endregion


        public IActionResult MEDashboard()
        {
            return View();
        }

        


















        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
