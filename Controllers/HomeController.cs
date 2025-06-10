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
        [HttpPost]
        public async Task<IActionResult> LoginUser(SystemUser model)
        {
            var CheckCredential = await _homerepo.LoginRepo(model);
            var user =CheckCredential.FirstOrDefault();
            
            if(user == null)
            {
                return Json(new { success = false, message = "Empno or password is incorrect!" });
            }
            else if (user.IsActive == false)
            {
                return Json(new { success = false, message = "Employee Number is not active user for this system." });
            } 
            else if (user.AuthorityLevel == 1)  //ADMIN
            {
                SetSession(user);
                return Json(new { success = true, redirectUrl = Url.Action("ProductionMaps", "Admin") });
            }
            else
            {
                SetSession(user);
                return Json(new { success = true, redirectUrl = Url.Action("Dashboard", "Home") });
            }     
        }
        #endregion

        public void SetSession(SystemUser model)
        {
            HttpContext.Session.SetString("EmployeeNo", model.EmployeeNo);
            HttpContext.Session.SetString("EmployeeName", model.EmployeeName);
            HttpContext.Session.SetString("AuthorityLevel", model.AuthorityLevel.ToString());
        }

        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Login", "Home");
        }

        public IActionResult Dashboard()
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
