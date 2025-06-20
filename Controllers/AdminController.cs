using MachineMonitoring.DataAccess.Repository;
using Microsoft.AspNetCore.Mvc;
using MachineMonitoring.DataAccess;
using MachineMonitoring.Models;
using Microsoft.AspNetCore.SignalR;
using MachineMonitoring.Models.ViewModel;
using static System.Net.Mime.MediaTypeNames;
using static System.Runtime.InteropServices.JavaScript.JSType;
using System.Linq.Expressions;

namespace MachineMonitoring.Controllers
{
    public class AdminController : Controller
    {
        private readonly ILogger<AdminController> _logger;
        private readonly AdminRepo _adminrepo;
        private readonly IWebHostEnvironment _env;
        private readonly AdminVM _adminvm;
        private readonly HomeRepo _homerepo;


        public AdminController(ILogger<AdminController> logger, AdminRepo adminrepo, IWebHostEnvironment env, AdminVM adminvm, HomeRepo homerepo)
        {
            _logger = logger;
            _adminrepo = adminrepo;
            _env = env;
            _adminvm = adminvm;
            _homerepo = homerepo;
        }

        #region 'ListProductionMaps - View'
        public async Task<IActionResult> ListProductionMaps()
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }
                var viewModel = new AdminVM
                {
                    Plants = await _adminrepo.GetPLantNoList(),

                };
                return View(viewModel);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'GetProductionMaps'
        [HttpGet]
        public async Task<IActionResult> GetProductionMaps(ProductionMap? model)
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }

                var locationList = await _adminrepo.GetProductionMapList(model);
                return Json(new { locationList });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'UploadProdMap || Add new prod map'
        [HttpPost]
        public async Task<IActionResult> UploadProdMap(ProductionMap model, IFormFile ImgFile)
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }

                var allowedExtensions = new[] { ".jpg", ".png" };
                var extension = Path.GetExtension(ImgFile.FileName).ToLower();

                if (!allowedExtensions.Contains(extension))
                {
                    ModelState.AddModelError("", "Unsupported file type.");
                    return View(model);
                }

                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    return BadRequest(new { success = false, message = "Model validation failed.", errors });
                }

                var checkProdName = await _adminrepo.CheckProdName(model);
                if (checkProdName > 0)
                {
                    return BadRequest("Production Name already exists!");
                }

                var fileName = Path.GetFileNameWithoutExtension(ImgFile.FileName);
                var fileExtension = Path.GetExtension(ImgFile.FileName);
                var uniqueFileName = $"{fileName}_{Guid.NewGuid()}{fileExtension}";

                var savePath = Path.Combine(_env.WebRootPath, "img/productionmap", uniqueFileName);

                model.CreatedBy = usersession;
                var success = await _adminrepo.UploadProdMapRepo(model, uniqueFileName);
                if (success)
                {
                    using (var stream = new FileStream(savePath, FileMode.Create))
                    {
                        await ImgFile.CopyToAsync(stream);
                    }
                    return Ok("Saved successfully.");
                }
                else
                {
                    return BadRequest("Failed to insert record.");
                }

            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error." + ex.Message);
            }
        }
        #endregion

        #region 'DeleteMap'
        public async Task<IActionResult> DeleteMap(ProductionMap model)
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }
                model.CreatedBy = usersession;
                var delete = await _adminrepo.DeleteMapData(model);
                if (delete)
                {
                    return Ok("Deleted successfully.");
                }
                else
                {
                    return BadRequest("Failed to delete record.");
                }

            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'UpdateProdMap || Update prod map and details'
        [HttpPost]
        public async Task<IActionResult> UpdateProdMap(ProductionMap model, IFormFile? ImgFile)
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }

                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    return BadRequest(new { success = false, message = "Model validation failed.", errors });
                }

                var checkProdName = await _adminrepo.CheckProdName(model);
                if (checkProdName > 0)
                {
                    return BadRequest("Production Name already exists!");
                }

                model.CreatedBy = usersession;

                #region 'image replacement if replaced by end-user'
                if (ImgFile != null)
                {
                    var allowedExtensions = new[] { ".jpg", ".png" };
                    var extension = Path.GetExtension(ImgFile.FileName).ToLower();
                    if (!allowedExtensions.Contains(extension))
                    {
                        ModelState.AddModelError("", "Unsupported file type.");
                        return View(model);
                    }
                    var fileName = Path.GetFileNameWithoutExtension(ImgFile.FileName);
                    var fileExtension = Path.GetExtension(ImgFile.FileName);
                    var uniqueFileName = $"{fileName}_{Guid.NewGuid()}{fileExtension}";
                    var savePath = Path.Combine(_env.WebRootPath, "img/productionmap", uniqueFileName);

                    // ❗ Get old image filename (you must pass it in the model or retrieve it from DB)
                    string oldImageFileName = model.ImgName;
                    var oldImagePath = Path.Combine(_env.WebRootPath, "img/productionmap", oldImageFileName);

                    var success = await _adminrepo.UploadProdMapReplacedImg(model, uniqueFileName);
                    if (success)
                    {
                        System.IO.File.Delete(oldImagePath);
                        using (var stream = new FileStream(savePath, FileMode.Create))
                        {
                            await ImgFile.CopyToAsync(stream);
                        }
                    }
                }
                #endregion

                //Update the other details'
                var UpdateProdMapDetails = await _adminrepo.UpdateProdMapDetails(model);
                return Ok("Saved successfully.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'ListMachineLocation - View'
        public async Task<IActionResult> ListMachineLocation(ProductionMap? model)
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }

                var viewModel = new AdminVM
                {
                    Plants = await _adminrepo.GetPLantNoList(),
                    ProductionMaps = await _adminrepo.GetProductionMapList(model)
                };

                return View(viewModel);
            }

            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'SaveMCCoordinates'
        [HttpPost]
        public async Task<IActionResult> SaveMcCoordinates(MachineLocation model)
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }

                if (model.MachineCode == null)
                {
                    return BadRequest("Please select machine code");
                }

                model.CreatedBy = usersession;
                var saved = await _adminrepo.SaveMcCoordinatesRepo(model);
                if (saved)
                {
                    return Ok("Saved successfully.");
                }
                else
                {
                    return BadRequest("Error in saving..");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error." + ex.Message);
            }
        }
        #endregion

        #region 'GetMCLocation'
        [HttpGet]
        public async Task<IActionResult> GetMCLocation(MachineLocation? model)
        {
            var usersession = HttpContext.Session.GetString("EmployeeNo");
            if (usersession == null)
            {
                return RedirectToAction("Logout", "Home");
            }
            var mclist = await _adminrepo.GetMCLocationRepo(model);
            return Json(new { mclist });
        }
        #endregion

        #region 'DeleteMCLocation'
        public async Task<IActionResult> DeleteMCLocation(MachineLocation model)
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }

                var delete = await _adminrepo.DeleteMCLocationRepo(model);
                if (delete)
                {
                    return Ok("Deleted successfully.");
                }
                else
                {
                    return BadRequest("Failed to delete record.");
                }

            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'UserManagement - View'
        public async Task<IActionResult> UserManagement()
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }

                var viewModel = new AdminVM
                {
                    SystemUsers = await _homerepo.GetUserRepo(),
                    Plants = await _adminrepo.GetPLantNoList(),
                    AuthorityList = await _adminrepo.GetAuthorityListRepo()
                };

                return View(viewModel);
            }

            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'DeleteUser'
        public async Task<IActionResult> DeleteUser(SystemUser model)
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }

                if (model.EmployeeNo == null)
                {
                    return BadRequest("Please reload page.");
                }

                var delete = await _adminrepo.DeleteUserRepo(model);
                if (delete)
                {
                    return Ok("Deleted successfully.");
                }
                else
                {
                    return BadRequest("Failed to delete record.");
                }

            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'Partial-UserManagement'
        public async Task<IActionResult> RefreshUserTable()
        {
            try
            {
                var users = await _homerepo.GetUserRepo();
                return PartialView("_PartialUserManagement", users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'AddNewUser'
        [HttpPost]
        public async Task<IActionResult> AddNewUser(SystemUser model)
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }

                if (model.Operation == "Add")
                {
                    var checkUser = await _homerepo.GetUserRepo();
                    var userExists = checkUser.FirstOrDefault(u => u.EmployeeNo == model.EmployeeNo);
                    if (userExists != null)
                    {
                        return BadRequest("Employee number already exists.");
                    }
                }

                model.CreatedBy = usersession;
                var saved = await _adminrepo.SaveUserRepo(model);
                if (saved)
                {
                    if(model.Operation == "Add")
                    {
                        return Ok("New user added successfully.");
                    }
                    else
                    {
                        return Ok("Updated successfully.");
                    }
                }
                else
                {
                    return BadRequest("Error in saving.");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error." + ex.Message);
            }
        }
        #endregion

        #region 'ResetPassword'
        [HttpPost]
        public async Task<IActionResult> ResetPassword(SystemUser model)
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }

                model.CreatedBy = usersession;
                var reset = await _adminrepo.ResetPasswordRepo(model);
                if (reset)
                {
                    return Ok("Password already reset");
                }
                else
                {
                    return BadRequest("Error in saving.");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error." + ex.Message);
            }
        }
        #endregion

        #region 'Profile - View'
        public async Task<IActionResult> Profile()
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }

                var viewModel = new AdminVM
                {
                    SystemUsers = await _homerepo.GetUserRepo(),
                    Plants = await _adminrepo.GetPLantNoList(),
                    AuthorityList = await _adminrepo.GetAuthorityListRepo()
                };

                return View(viewModel);
            }

            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'ChangeProfileDetails'
        public async Task<IActionResult> ChangeProfileDetails(string EmployeeName, int PlantNo)
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                var usersessionname = HttpContext.Session.GetString("EmployeeName");
                var usersessionplantno = HttpContext.Session.GetInt32("PlantNo");

                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }

                if(EmployeeName == usersessionname && PlantNo == usersessionplantno)
                {
                    return BadRequest("There are no changes to save.");
                }

                var update = await _adminrepo.UpdateProfileDetails(EmployeeName,PlantNo,usersession);
                if (update)
                {
                    HttpContext.Session.SetString("EmployeeName", EmployeeName);
                    HttpContext.Session.SetInt32("PlantNo", PlantNo);
                    return Ok("Update successfully.");
                }
                else
                {
                    return BadRequest("Failed to update record.");
                }

            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'ProductionMap - View'
        [HttpGet]
        public async Task<IActionResult> ProductionMap(ProductionMap? model)
        {
            try
            {
                var usersession = HttpContext.Session.GetString("EmployeeNo");
                if (usersession == null)
                {
                    return RedirectToAction("Logout", "Home");
                }

                var viewModel = new AdminVM
                {
                    Plants = await _adminrepo.GetPLantNoList(),
                    ProductionMaps = await _adminrepo.GetProductionMapList(model)
                };

                return View(viewModel);
            }

            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion
    }
}
