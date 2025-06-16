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

        #region 'Login - View'
        public IActionResult Login()
        {
            return View();
        }
        #endregion

        #region 'Login - POST'
        public async Task<ActionResult<SystemUser>> LoginUser(SystemUser model)
        {
            IEnumerable<SystemUser> AllEmployee = await _homerepo.GetUserRepo();

            SystemUser? foundEmployee = AllEmployee.SingleOrDefault(e => e.EmployeeNo == model.EmployeeNo);


            //var user =CheckCredential.FirstOrDefault();

            if (foundEmployee == null)
            {
                return Json(new { success = false, message = "Empno or password is incorrect!" });
            }
            else if (foundEmployee.IsActive == false)
            {
                return Json(new { success = false, message = "Employee Number is not active user for this system." });
            }
            else if (foundEmployee.EmployeeNo.ToString() == model.Password)  //Password is EmployeeNo
            {
                SetSession(foundEmployee);
                return Json(new { success = true, redirectUrl = Url.Action("ChangePassword", "Home") });
            }
            else if (foundEmployee.AuthorityLevel == 1)  //SYSTEM ADMIN
            {
                SetSession(foundEmployee);
                return Json(new { success = true, redirectUrl = Url.Action("Profile", "Admin") });
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
            HttpContext.Session.SetInt32("EmployeeNo", model.EmployeeNo);
            HttpContext.Session.SetString("EmployeeName", model.EmployeeName);
            HttpContext.Session.SetInt32("AuthorityLevel", model.AuthorityLevel);
            HttpContext.Session.SetString("AuthorityName", model.AuthorityName);
            HttpContext.Session.SetInt32("PlantNo", model.PlantNo);
        }
        #endregion

        #region 'Logout'
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Login", "Home");
        }
        #endregion

        #region 'ChangePassword - View'
        public IActionResult ChangePassword()
        {
            var usersession = HttpContext.Session.GetString("EmployeeNo");
            if (usersession == null)
            {
                return RedirectToAction("Logout", "Home");
            }
            else
            {
                return View();
            }
        }
        #endregion

        #region 'ChangePassword'
        [HttpPost]
        public async Task<IActionResult> ChangePassword(SystemUser model)
        {
            try
            {
                var usersession = HttpContext.Session.GetInt32("EmployeeNo");
                if (usersession == null)
                {
                    return BadRequest("Error. Please reload page.");
                }
                else
                {
                    model.CreatedBy = usersession.ToString();

                    var reset = await _homerepo.ChangePasswordRepo(model);
                    if (reset)
                    {
                        return Ok("Saved successfully.");
                    }
                    else
                    {
                        return BadRequest("Error in saving.");
                    }
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error." + ex.Message);
            }
        }
        #endregion

        #region 'ME Dashboard - View'
        public IActionResult MEDashboard()
        {
            var usersession = HttpContext.Session.GetString("EmployeeNo");
            if (usersession == null)
            {
                return RedirectToAction("Logout", "Home");
            }
            else
            {
                return View();
            }
        }
        #endregion




        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
