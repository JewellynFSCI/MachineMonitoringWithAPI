using System.Text;
using MachineMonitoring.Models.DTOs;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace MachineMonitoring.Controllers
{
    public class WinLoginAuth : Controller
    {
        private const string _sessionUserName = "_Username";
        private const string _sessionUserType = "_Usertype";
        private const string _sessionEmployeeName = "_EmployeeName";
        private const string _sessionEmployeeNumber = "_EmployeeNumber";
        private const string _memberOfAcc = "";
        private const string _memberOfAdmin = "app.planvsactual.admin";
        private readonly string _ldapUrl = "";

        public WinLoginAuth(IConfiguration configuration)
        {
            _ldapUrl = configuration.GetConnectionString("LdapURL") ?? "";
        }

        public IActionResult Win_Login()
        {
            return View();
        }


        #region 'Login - POST'
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Login(LoginDto dto)
        {
            if (ModelState.IsValid)
            {
                Response<Account> response = GetAccount(dto).GetAwaiter().GetResult();

                if (response.Success && response.Data != null)
                {
                    string userType = "";
                    var accounts = response.Data;
                    bool hasAccount = false;
                    string employeeNumber = accounts.Office;
                    var memberOf = accounts.MemberOf;
                    string employeeName = accounts.GetFullName();
                    if (memberOf.Contains(_memberOfAdmin))
                    {
                        userType = "ADMIN";
                        hasAccount = true;
                    }
                    else if (memberOf.Contains(_memberOfAcc))
                    {
                        userType = "MIS";
                        hasAccount = true;
                    }

                    if (hasAccount)
                    {
                        HttpContext.Session.SetString(_sessionUserName, accounts.Username);
                        HttpContext.Session.SetString(_sessionUserType, userType);
                        HttpContext.Session.SetString(_sessionEmployeeName, employeeName);
                        HttpContext.Session.SetString(_sessionEmployeeNumber, employeeNumber);
                        ViewBag.Session = accounts.Username;

                        //TempData["SweetAlertMessage"] = "Login Sucessful!";

                        return Redirect(TempData["ReturnURL"] as string ?? "~/Admin/ProductionMap");
                    }
                    else
                    {
                        ViewData["Message"] = "Username is not registered to the system!";
                        return View("Win_Login");
                    }
                }
                else
                {
                    ViewData["Message"] = response.Message;
                    return View("Win_Login");
                }
            }
            return View();
        }
#endregion

        #region 'Login the account using API'
        private async Task<Response<Account>> GetAccount(LoginDto dto)
        {
            Response<Account> Res;
            JObject login = new JObject
                {
                    { "username", dto.UserName },
                    { "password", dto.Password }
                };

            var json = JsonConvert.SerializeObject(login);
            var data = new StringContent(json, Encoding.UTF8, "application/json");

            using (var client = new HttpClient())
            {
                var response = await client.PostAsync(_ldapUrl, data);
                string result = response.Content.ReadAsStringAsync().Result;
                Res = JsonConvert.DeserializeObject<Response<Account>>(result) ?? new Response<Account>();
            }
            return Res;
        }
        #endregion

        #region 'Logout'
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Win_Login", "WinLoginAuth");
        }
        #endregion

    }
}
